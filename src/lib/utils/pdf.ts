import { jsPDF } from "jspdf";

export interface SaveImagesAsPdfOptions {
  /** 각 페이지(이미지)의 가로 길이. 기본값 480. */
  width?: number;
  /** 각 페이지(이미지)의 세로 길이. 기본값 270. */
  height?: number;
  /** 저장할 파일 이름. 기본값 "pp2pdf.pdf". */
  fileName?: string;
}

const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 270;
const DEFAULT_BACKGROUND_COLOR = "#161616";
const DEFAULT_FILE_NAME = "pp2pdf.pdf";

/** 배경 박스가 페이지 가장자리를 넘어 덧대어지는 여백. */
const BACKGROUND_OVERFLOW = 10;

/**
 * 이미지 URL 배열을 받아 각 이미지를 한 페이지씩 담은 PDF를 만들어 저장한다.
 *
 * 각 페이지에는 이미지 뒤로 페이지 배경이 비치지 않도록 배경 박스를 가장 먼저
 * 그린 뒤, 그 위에 이미지를 페이지에 꽉 차게 배치한다.
 */
export async function saveImagesAsPdf(
  imageUrls: string[],
  options: SaveImagesAsPdfOptions = {},
): Promise<void> {
  const {
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
    fileName = DEFAULT_FILE_NAME,
  } = options;

  const orientation = width >= height ? "landscape" : "portrait";
  const [bgRed, bgGreen, bgBlue] = parseHexColor(DEFAULT_BACKGROUND_COLOR);

  const doc = new jsPDF({
    unit: "px",
    format: [width, height],
    orientation,
  });

  for (let index = 0; index < imageUrls.length; index += 1) {
    if (index > 0) {
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

    const { dataUrl, format } = await fetchImageAsDataUrl(imageUrls[index]);
    // alias는 지정하지 않고(undefined), compression으로 이미지를 압축한다.
    doc.addImage(dataUrl, format, 0, 0, width, height, undefined, "MEDIUM");
  }

  doc.save(fileName);
}

async function fetchImageAsDataUrl(
  url: string,
): Promise<{ dataUrl: string; format: string }> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`이미지를 불러오지 못했습니다: ${response.status} ${url}`);
  }

  const blob = await response.blob();
  const dataUrl = await blobToDataUrl(blob);

  return { dataUrl, format: mimeToImageFormat(blob.type) };
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
