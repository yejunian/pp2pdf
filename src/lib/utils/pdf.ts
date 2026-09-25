import { jsPDF } from "jspdf";

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
  // TODO: 아래 옵션은 아직 PDF 생성에 반영하지 않음.
  /** 재생목록 헤더마다 헤더 페이지 생성. */
  includeHeaderPages: boolean;
  /** 비활성화된 슬라이드를 흐리게 표시("dim")하거나 생략("skip"). */
  disabledSlides: "dim" | "skip";
  /** 슬라이드 그룹, 라벨 표시. */
  showGroupsAndLabels: boolean;
}

export const DEFAULT_PDF_OPTIONS: PdfOptions = {
  name: "",
  imageSize: 960,
  compression: "MEDIUM",
  backgroundColor: "#161616",
  includeHeaderPages: true,
  disabledSlides: "dim",
  showGroupsAndLabels: true,
};

export interface SaveImagesAsPdfOptions {
  /** 저장할 파일 이름. 기본값 "pp2pdf.pdf". */
  fileName?: string;
  /** PDF 문서 속성의 제목. */
  title?: string;
  /** 이미지 압축 수준. 기본값 "MEDIUM". */
  compression?: PdfCompression;
  /** 투명 영역 배경 색상. 기본값 "#161616". */
  backgroundColor?: string;
  /** 중간에 취소하기 위한 신호. */
  signal?: AbortSignal;
  /** 페이지 하나를 추가할 때마다 호출된다. */
  onProgress?: (done: number, total: number) => void;
}

const DEFAULT_FILE_NAME = "pp2pdf.pdf";

/** 배경 박스가 페이지 가장자리를 넘어 덧대어지는 여백. */
const BACKGROUND_OVERFLOW = 10;

/**
 * 이미지 URL 배열을 받아 각 이미지를 한 페이지씩 담은 PDF를 만들어 저장한다.
 *
 * 각 페이지의 크기는 그 이미지의 크기와 같다. 이미지 뒤로 페이지 배경이
 * 비치지 않도록 배경 박스를 가장 먼저 그린 뒤, 그 위에 이미지를 페이지에
 * 꽉 차게 배치한다.
 */
export async function saveImagesAsPdf(
  imageUrls: string[],
  options: SaveImagesAsPdfOptions = {},
): Promise<void> {
  const {
    fileName = DEFAULT_FILE_NAME,
    title,
    compression = DEFAULT_PDF_OPTIONS.compression,
    backgroundColor = DEFAULT_PDF_OPTIONS.backgroundColor,
    signal,
    onProgress,
  } = options;

  if (imageUrls.length === 0) {
    throw new Error("PDF로 만들 슬라이드가 없습니다.");
  }

  const [bgRed, bgGreen, bgBlue] = parseHexColor(backgroundColor);
  let doc: jsPDF | undefined;

  onProgress?.(0, imageUrls.length);

  for (let index = 0; index < imageUrls.length; index += 1) {
    signal?.throwIfAborted();

    const { dataUrl, format, width, height } = await fetchImage(
      imageUrls[index],
      signal,
    );
    const orientation = width >= height ? "landscape" : "portrait";

    if (!doc) {
      doc = new jsPDF({ unit: "px", format: [width, height], orientation });
      if (title) {
        doc.setDocumentProperties({ title });
      }
    } else {
      doc.addPage([width, height], orientation);
    }

    // 배경 박스를 맨 먼저 그려 페이지의 가장 뒤에 두고, 선은 그리지 않는다("F").
    doc.setFillColor(bgRed, bgGreen, bgBlue);
    doc.rect(
      -BACKGROUND_OVERFLOW,
      -BACKGROUND_OVERFLOW,
      width + BACKGROUND_OVERFLOW * 2,
      height + BACKGROUND_OVERFLOW * 2,
      "F",
    );

    // alias는 지정하지 않고(undefined), compression으로 이미지를 압축한다.
    doc.addImage(dataUrl, format, 0, 0, width, height, undefined, compression);

    onProgress?.(index + 1, imageUrls.length);
  }

  signal?.throwIfAborted();
  doc?.save(fileName);
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
