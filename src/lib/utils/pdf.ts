import { jsPDF } from "jspdf";
import fontUrl from "$lib/assets/Freesentation-6SemiBold.ttf?url";
import type { PColor } from "$lib/types/pp";
import type { PdfPageSource } from "$lib/utils/pp";
import type { ThumbnailType } from "$lib/utils/pp-requests";

/**
 * jsPDF 이미지 압축 수준. 무압축("NONE")은 쓰지 않는다. PNG로 넣는 페이지에만
 * 적용되고, JPEG는 압축 수준과 관계없이 그대로 들어간다.
 */
export type PdfCompression = "FAST" | "MEDIUM" | "SLOW";

/** 사용자가 화면에서 고르는 PDF 생성 옵션. */
export interface PdfOptions {
  /** PDF 제목 및 파일 이름. */
  name: string;
  /**
   * 슬라이드 이미지의 긴 변 길이(px). ProPresenter 섬네일 요청과 페이지 크기에
   * 쓰며, 이보다 크게 받은 섬네일은 이 크기로 줄인다.
   */
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
  /** 슬라이드 이미지의 긴 변 길이(px). 섬네일이 이보다 크면 줄인다. 기본값 960. */
  imageSize?: number;
  /** PNG 이미지 압축 수준. 기본값 "MEDIUM". */
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
 * 상단 텍스트 줄별 글자 크기·줄 높이 배율(%). 둘째 줄은 첫 줄의 80%로 줄인다.
 *
 * 부동소수점 오차를 피하려고 정수 백분율로 두고, 정수끼리 곱한 뒤 마지막에
 * 100으로 나눈다.
 */
const LINE_SCALE_PERCENTS = [100, 80];

/**
 * PNG 섬네일을 JPEG로 변환할 때의 품질(0~1).
 *
 * ProPresenter 21.4(Mac)는 JPEG 섬네일을 Apple ImageIO 품질 0.75로 만든다.
 * 같은 품질 값이라도 브라우저의 JPEG 인코더마다 결과가 달라서, Chrome에서
 * ProPresenter JPEG와 화질(PSNR)이 같아지는 0.92를 쓴다. Safari(ImageIO)는
 * 0.75에서 같아지고, Firefox는 0.9 이상에서 크로마 서브샘플링을 끈다. 그래서
 * 둘 다 0.92에서는 ProPresenter JPEG보다 파일이 커진다.
 *
 * Windows판(21.4.2)은 IJG 표준 테이블 품질 90을 쓴다. 다만 Chrome에서 0.92로
 * 변환한 JPEG가 ProPresenter JPEG보다 화질은 높고 파일은 작다.
 */
const JPEG_QUALITY = 0.92;

/**
 * 슬라이드 정보 배열을 받아 각 슬라이드를 한 페이지씩 담은 PDF를 만들어
 * 저장한다.
 *
 * 길이 단위는 pt이며, 슬라이드 이미지의 1px을 1pt로 넣는다. 페이지 여백
 * padding은 (슬라이드 가로 / 160)을 짝수로 올림한 값이다. 슬라이드 이미지는
 * 그룹 색상 테두리(두께 padding)로 감싸서 페이지 아래쪽에 두고, 그 위로
 * 텍스트 줄을 옵션에 따라 0~2줄 둔다. 첫 줄은 글자 크기 padding * 8, 높이
 * padding * 10이고, 둘째 줄은 둘 다 첫 줄의 80%이다(줄 높이는 소수점 올림).
 * 페이지 번호는 항상 페이지 오른쪽 위에 첫 줄과 같은 크기로 넣는다.
 *
 * 슬라이드 이미지는 페이지마다 PNG와 JPEG 중 저장 크기가 더 크지 않은 쪽의
 * 포맷으로 넣는다(`fetchSlideImage` 참고).
 */
export async function saveSlidesAsPdf(
  pages: PdfPageSource[],
  options: SaveSlidesAsPdfOptions = {},
): Promise<void> {
  const {
    fileName = DEFAULT_FILE_NAME,
    title,
    imageSize = DEFAULT_PDF_OPTIONS.imageSize,
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
  const linePercents = LINE_SCALE_PERCENTS.slice(0, lineCount);
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
    } = await fetchSlideImage(page.imageUrls, imageSize, background, signal);

    const padding = Math.ceil(slideWidth / 320) * 2;
    const fontSize = padding * 8;
    const lineHeight = padding * 10;
    // 줄 높이는 배율을 곱한 뒤 소수점을 올림한다. 글자 크기는 그대로 둔다.
    const lineHeights = linePercents.map((percent) =>
      Math.ceil((lineHeight * percent) / 100),
    );
    const textHeight = lineHeights.reduce((sum, height) => sum + height, 0);
    const pageWidth = padding * 4 + slideWidth;
    const pageHeight = padding * 4 + slideHeight + textHeight;
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

    // alias는 지정하지 않는다(undefined). compression은 PNG에만 적용되고,
    // JPEG는 데이터를 그대로 넣는다.
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

    doc.setFontSize(fontSize);
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
    let lineTop = padding;
    lines.forEach((line, lineIndex) => {
      // fitText가 줄인 글자 크기로 폭을 재도록 먼저 크기를 바꾼다.
      doc!.setFontSize((fontSize * linePercents[lineIndex]) / 100);
      const text = fitText(
        doc!,
        line,
        lineIndex === 0 ? firstLineWidth : fullWidth,
      );
      if (text) {
        doc!.text(text, padding, lineTop + lineHeights[lineIndex] / 2, {
          baseline: "middle",
          renderingMode: "fill",
        });
      }
      lineTop += lineHeights[lineIndex];
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

interface SlideImage {
  dataUrl: string;
  format: ImageFormat;
  width: number;
  height: number;
}

/**
 * 같은 슬라이드의 섬네일을 PNG와 JPEG로 1장씩 받아서, 저장 크기가 더 크지
 * 않은 쪽의 포맷으로 PDF에 넣을 이미지를 만든다. 크기가 같으면 PNG를 쓴다.
 *
 * - PNG가 더 작으면 받은 PNG를 그대로 쓴다.
 * - JPEG가 더 작으면 받은 JPEG는 크기 비교에만 쓴다. 받은 PNG 뒤에 배경색을
 *   깔고 JPEG로 변환해서, 투명한 부분이 배경색으로 보이게 한다.
 *
 * 섬네일의 긴 변이 imageSize보다 크면 받은 PNG를 imageSize로 줄인다. 이때는
 * 받은 두 이미지의 크기가 출력 크기에서의 크기와 맞지 않으므로, 줄인 이미지를
 * PNG와 JPEG로 각각 인코딩해서 비교한다. Windows판 ProPresenter의 재생목록
 * 섬네일이 이렇게 요청보다 크게 온다. quality를 짧은 변 길이로 보고 디스플레이
 * 배율까지 곱해서 만들며, 내용이 같은 슬라이드는 이전에 더 크게 만든 섬네일을
 * 그대로 주기 때문이다.
 */
async function fetchSlideImage(
  urls: Record<ThumbnailType, string>,
  imageSize: number,
  background: [number, number, number],
  signal?: AbortSignal,
): Promise<SlideImage> {
  const [png, jpeg] = await Promise.all([
    fetchBlob(urls.png, signal),
    fetchBlob(urls.jpeg, signal),
  ]);
  // jsPDF는 PNG의 색 프로필을 무시하고 픽셀값을 그대로 넣는다. JPEG로 변환할
  // 때도 색 공간을 바꾸지 않아야 두 포맷으로 넣은 페이지의 색이 같아진다.
  const bitmap = await createImageBitmap(png, { colorSpaceConversion: "none" });

  try {
    const scale = imageSize / Math.max(bitmap.width, bitmap.height);

    if (scale < 1) {
      return await shrinkAndPickSmaller(bitmap, scale, background);
    }

    const { width, height } = bitmap;

    if (png.size <= jpeg.size) {
      const dataUrl = await blobToDataUrl(png);
      return { dataUrl, format: mimeToImageFormat(png.type), width, height };
    }

    const dataUrl = await blobToDataUrl(
      await convertToJpeg(bitmap, background),
    );
    return { dataUrl, format: "JPEG", width, height };
  } finally {
    bitmap.close();
  }
}

/**
 * 이미지를 scale배로 줄인 뒤 PNG와 JPEG(배경색을 깖)로 각각 인코딩해서, 저장
 * 크기가 더 크지 않은 쪽을 고른다.
 */
async function shrinkAndPickSmaller(
  image: ImageBitmap,
  scale: number,
  background: [number, number, number],
): Promise<SlideImage> {
  // drawImage로 크게 줄이면 Firefox와 Safari에서 글자 가장자리가 거칠어지므로
  // createImageBitmap의 고품질 리사이즈를 쓴다.
  const resized = await createImageBitmap(image, {
    resizeWidth: Math.round(image.width * scale),
    resizeHeight: Math.round(image.height * scale),
    resizeQuality: "high",
  });

  try {
    const { width, height } = resized;
    const [png, jpeg] = await Promise.all([
      drawOnCanvas(resized).convertToBlob({ type: "image/png" }),
      convertToJpeg(resized, background),
    ]);
    const usePng = png.size <= jpeg.size;
    const dataUrl = await blobToDataUrl(usePng ? png : jpeg);
    return { dataUrl, format: usePng ? "PNG" : "JPEG", width, height };
  } finally {
    resized.close();
  }
}

async function fetchBlob(url: string, signal?: AbortSignal): Promise<Blob> {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`이미지를 불러오지 못했습니다: ${response.status} ${url}`);
  }

  return await response.blob();
}

/** 이미지 뒤에 배경색을 깔고 JPEG로 변환한다. */
async function convertToJpeg(
  image: ImageBitmap,
  background: [number, number, number],
): Promise<Blob> {
  return await drawOnCanvas(image, background).convertToBlob({
    type: "image/jpeg",
    quality: JPEG_QUALITY,
  });
}

/** 이미지와 같은 크기의 캔버스에 이미지를 그린다. background가 있으면 먼저 깐다. */
function drawOnCanvas(
  image: ImageBitmap,
  background?: [number, number, number],
): OffscreenCanvas {
  const canvas = new OffscreenCanvas(image.width, image.height);
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("이미지를 변환하지 못했습니다.");
  }

  if (background) {
    const [red, green, blue] = background;
    context.fillStyle = `rgb(${red}, ${green}, ${blue})`;
    context.fillRect(0, 0, image.width, image.height);
  }

  context.drawImage(image, 0, 0);
  return canvas;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

type ImageFormat = "PNG" | "JPEG";

// ProPresenter는 jpeg 또는 png만 응답하므로 두 포맷만 처리한다.
function mimeToImageFormat(mimeType: string): ImageFormat {
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
