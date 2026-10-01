import { jsPDF } from "jspdf";
import fontUrl from "$lib/assets/Freesentation-6SemiBold.ttf?url";
import type { PColor } from "$lib/types/pp";
import type { PdfPageSource } from "$lib/utils/pp";

/** jsPDF 이미지 압축 수준. 무압축("NONE")은 쓰지 않는다. */
export type PdfCompression = "FAST" | "MEDIUM" | "SLOW";

/** 사용자가 화면에서 고르는 PDF 생성 옵션. */
export interface PdfOptions {
  /** PDF 제목 및 파일 이름. */
  name: string;
  /** 슬라이드 이미지의 긴 변 길이(px). ProPresenter 섬네일 요청과 페이지 크기에 쓴다. */
  imageSize: number;
  compression: PdfCompression;
  /** 이미지의 투명한 부분 뒤로 깔 배경 색상. */
  backgroundColor: string;
  /** 슬라이드 그룹, 라벨 표시. */
  showGroupsAndLabels: boolean;
  // TODO: 아래 옵션은 아직 PDF 생성에 반영하지 않음.
  /** 재생목록 헤더마다 헤더 페이지 생성. */
  includeHeaderPages: boolean;
  /** 비활성화된 슬라이드를 흐리게 표시("dim")하거나 생략("skip"). */
  disabledSlides: "dim" | "skip";
}

export const DEFAULT_PDF_OPTIONS: PdfOptions = {
  name: "",
  imageSize: 960,
  compression: "MEDIUM",
  backgroundColor: "#161616",
  includeHeaderPages: false, // TODO: 구현 전까지 임시로 off 처리
  disabledSlides: "dim",
  showGroupsAndLabels: true,
};

export interface SaveSlidesAsPdfOptions {
  /** 저장할 파일 이름. 기본값 "pp2pdf.pdf". */
  fileName?: string;
  /** PDF 문서 속성의 제목. */
  title?: string;
  /** 이미지 압축 수준. 기본값 "MEDIUM". */
  compression?: PdfCompression;
  /** 투명 영역 배경 색상. 기본값 "#161616". */
  backgroundColor?: string;
  /** 슬라이드 위에 프레젠테이션 이름 표시. 입력이 재생목록일 때 켠다. */
  showPresentationName?: boolean;
  /** 슬라이드 위에 슬라이드 그룹, 라벨 표시. */
  showGroupsAndLabels?: boolean;
  /** 중간에 취소하기 위한 신호. */
  signal?: AbortSignal;
  /** 페이지 하나를 추가할 때마다 호출된다. */
  onProgress?: (done: number, total: number) => void;
}

const DEFAULT_FILE_NAME = "pp2pdf.pdf";

const FONT_FILE_NAME = "Freesentation-6SemiBold.ttf";
const FONT_NAME = "Freesentation";

/**
 * 슬라이드 정보 배열을 받아 각 슬라이드를 한 페이지씩 담은 PDF를 만들어
 * 저장한다.
 *
 * 길이 단위는 pt이며, 슬라이드 이미지의 1px을 1pt로 넣는다. 페이지 여백
 * padding은 ceil(슬라이드 가로 / 160)이다. 슬라이드 이미지는 그룹 색상
 * 테두리(두께 padding)로 감싸서 페이지 아래쪽에 두고, 그 위로 텍스트 줄(각
 * 높이 padding * 10)을 옵션에 따라 0~2줄 둔다. 페이지 번호는 항상 페이지
 * 오른쪽 위에 넣는다.
 */
export async function saveSlidesAsPdf(
  pages: PdfPageSource[],
  options: SaveSlidesAsPdfOptions = {},
): Promise<void> {
  const {
    fileName = DEFAULT_FILE_NAME,
    title,
    compression = DEFAULT_PDF_OPTIONS.compression,
    backgroundColor = DEFAULT_PDF_OPTIONS.backgroundColor,
    showPresentationName = false,
    showGroupsAndLabels = DEFAULT_PDF_OPTIONS.showGroupsAndLabels,
    signal,
    onProgress,
  } = options;

  if (pages.length === 0) {
    throw new Error("PDF로 만들 슬라이드가 없습니다.");
  }

  const background = parseHexColor(backgroundColor);
  const fontBase64 = await fetchFontBase64(signal);
  const lineCount = Number(showPresentationName) + Number(showGroupsAndLabels);
  let doc: jsPDF | undefined;

  onProgress?.(0, pages.length);

  for (let index = 0; index < pages.length; index += 1) {
    signal?.throwIfAborted();

    const page = pages[index];
    const {
      dataUrl,
      format,
      width: slideWidth,
      height: slideHeight,
    } = await fetchImage(page.imageUrl, signal);

    const padding = Math.ceil(slideWidth / 160);
    const lineHeight = padding * 10;
    const pageWidth = padding * 4 + slideWidth;
    const pageHeight = padding * 4 + slideHeight + lineHeight * lineCount;
    const orientation = pageWidth >= pageHeight ? "landscape" : "portrait";

    if (!doc) {
      doc = new jsPDF({
        unit: "pt",
        format: [pageWidth, pageHeight],
        orientation,
      });
      if (title) {
        doc.setDocumentProperties({ title });
      }
      doc.addFileToVFS(FONT_FILE_NAME, fontBase64);
      doc.addFont(FONT_FILE_NAME, FONT_NAME, "normal");
      doc.setFont(FONT_NAME);
      doc.setLineJoin("round");
    } else {
      doc.addPage([pageWidth, pageHeight], orientation);
    }

    // 그룹 색상 테두리. 그룹 정보가 없으면 투명 영역 색상으로 칠한다.
    const slideTop = pageHeight - padding * 2 - slideHeight;
    doc.setFillColor(
      ...(page.groupColor ? toRgb(page.groupColor) : background),
    );
    doc.rect(
      padding,
      slideTop - padding,
      slideWidth + padding * 2,
      slideHeight + padding * 2,
      "F",
    );

    // 이미지의 투명한 부분 뒤로 비칠 배경을 이미지보다 먼저 그린다.
    doc.setFillColor(...background);
    doc.rect(padding * 2, slideTop, slideWidth, slideHeight, "F");

    // alias는 지정하지 않고(undefined), compression으로 이미지를 압축한다.
    doc.addImage(
      dataUrl,
      format,
      padding * 2,
      slideTop,
      slideWidth,
      slideHeight,
      undefined,
      compression,
    );

    doc.setFontSize(padding * 8);
    doc.setTextColor(0, 0, 0);

    // 페이지 번호. 텍스트 줄이 없으면 슬라이드와 겹치므로 흰색 외곽선을 먼저
    // 그리고, 그 위에 검은색으로 채워서 글자 획이 가늘어지지 않게 한다.
    const pageNumber = `${page.pageNumber}/${page.pageCount}`;
    const firstLineY = padding + lineHeight / 2;
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(padding * 1.5);
    for (const renderingMode of ["stroke", "fill"] as const) {
      doc.text(pageNumber, pageWidth - padding * 3, firstLineY, {
        align: "right",
        baseline: "middle",
        renderingMode,
      });
    }

    const lines: string[] = [];
    if (showPresentationName) {
      lines.push(page.presentationName);
    }
    if (showGroupsAndLabels) {
      lines.push(formatGroupAndLabel(page.groupName, page.label));
    }

    // 첫 줄은 페이지 번호(외곽선 포함)를 침범하지 않도록 폭을 더 줄인다.
    const fullWidth = pageWidth - padding * 2;
    const firstLineWidth =
      fullWidth - doc.getTextWidth(pageNumber) - padding * 4;
    lines.forEach((line, lineIndex) => {
      const text = fitText(
        doc!,
        line,
        lineIndex === 0 ? firstLineWidth : fullWidth,
      );
      if (text) {
        doc!.text(text, padding, firstLineY + lineHeight * lineIndex, {
          baseline: "middle",
          renderingMode: "fill",
        });
      }
    });

    onProgress?.(index + 1, pages.length);
  }

  signal?.throwIfAborted();
  doc?.save(fileName);
}

/** "[그룹] 라벨" 형태로 합친다. 비어 있는 쪽은 생략한다. */
function formatGroupAndLabel(groupName = "", label = ""): string {
  return [groupName && `[${groupName}]`, label].filter(Boolean).join(" ");
}

/** maxWidth를 넘는 텍스트는 줄 바꿈 없이 끝을 "…"로 줄인다. */
function fitText(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) {
    return text;
  }

  const chars = Array.from(text.trim());
  while (chars.length > 0) {
    chars.pop();
    const candidate = `${chars.join("").trimEnd()}…`;
    if (doc.getTextWidth(candidate) <= maxWidth) {
      return candidate;
    }
  }

  return "";
}

/** ProPresenter 색상(0~1 실수)을 [r, g, b](0~255)로 변환한다. alpha는 무시한다. */
function toRgb({ red, green, blue }: PColor): [number, number, number] {
  const toByte = (value: number) =>
    Math.round(Math.min(Math.max(value, 0), 1) * 255);
  return [toByte(red), toByte(green), toByte(blue)];
}

let fontBase64Promise: Promise<string> | undefined;

/** 텍스트에 쓸 폰트 파일을 base64로 불러온다. 한 번 불러온 뒤로는 재사용한다. */
async function fetchFontBase64(signal?: AbortSignal): Promise<string> {
  fontBase64Promise ??= (async () => {
    const response = await fetch(fontUrl);

    if (!response.ok) {
      throw new Error(`폰트를 불러오지 못했습니다: ${response.status}`);
    }

    const dataUrl = await blobToDataUrl(await response.blob());
    return dataUrl.slice(dataUrl.indexOf(",") + 1);
  })();

  try {
    const fontBase64 = await fontBase64Promise;
    signal?.throwIfAborted();
    return fontBase64;
  } catch (error) {
    fontBase64Promise = undefined;
    throw error;
  }
}

async function fetchImage(
  url: string,
  signal?: AbortSignal,
): Promise<{ dataUrl: string; format: string; width: number; height: number }> {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`이미지를 불러오지 못했습니다: ${response.status} ${url}`);
  }

  const blob = await response.blob();
  const [dataUrl, { width, height }] = await Promise.all([
    blobToDataUrl(blob),
    getImageSize(blob),
  ]);

  return { dataUrl, format: mimeToImageFormat(blob.type), width, height };
}

async function getImageSize(
  blob: Blob,
): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob);
  const { width, height } = bitmap;
  bitmap.close();
  return { width, height };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// ProPresenter는 jpeg 또는 png만 응답하므로 두 포맷만 처리한다.
function mimeToImageFormat(mimeType: string): string {
  return mimeType === "image/png" ? "PNG" : "JPEG";
}

/** "#161616" 또는 "#161" 형태의 16진 색상 문자열을 [r, g, b]로 변환한다. */
function parseHexColor(hex: string): [number, number, number] {
  const normalized = hex.replace(/^#/, "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((channel) => channel + channel)
          .join("")
      : normalized;

  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}
