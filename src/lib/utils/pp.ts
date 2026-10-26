import type { PColor, PObjectId, PPresentation } from "$lib/types/pp";
import {
  getPlaylistById,
  getPlaylistSlideThumbUrl,
  getPresentationByUuid,
  getPresentationSlideThumbUrl,
} from "$lib/utils/pp-requests";

/** PDF로 만들 대상. 재생목록(폴더 제외) 또는 프레젠테이션 1개. */
export type PSelection = {
  type: "playlist" | "presentation";
  id: PObjectId;
};

/** PDF 한 페이지를 만드는 데 필요한 슬라이드 정보. */
export type PdfPageSource = {
  imageUrl: string;
  /** 현재 프레젠테이션 기준 페이지 번호(1부터). */
  pageNumber: number;
  /** 현재 프레젠테이션의 슬라이드 개수. */
  pageCount: number;
  presentationName: string;
  groupName?: string;
  groupColor?: PColor;
  label?: string;
};

type PCue = Pick<PdfPageSource, "groupName" | "groupColor" | "label">;

const defaultGroupNames = new Set(["", "group", "그룹"]);

/** 마스터 정렬이면 undefined, 아니면 해당 정렬을 반환한다. */
function findArrangement(
  presentation: PPresentation,
  arrangementUuid: string,
): PPresentation["arrangements"][number] | undefined {
  const current = presentation.arrangements.find(
    (arrangement) => arrangement.id.uuid === arrangementUuid,
  );

  // 1. uuid가 arrangementUuid와 일치하는 항목이 없으면 마스터 정렬
  if (!current) {
    return undefined;
  }

  // 2. [win] name이 "", index가 0, groups가 [], total_cues가 0이면 마스터
  if (
    !current.id?.name &&
    !current.id?.index &&
    !current.groups?.length &&
    !current.total_cues
  ) {
    return undefined;
  }

  // 3. 그 외: 일치하는 항목
  return current;
}

export function getArrangementLength(
  presentation: PPresentation,
  arrangementUuid: string,
): number {
  const arrangement = findArrangement(presentation, arrangementUuid);
  return arrangement ? arrangement.total_cues : presentation.total_cues;
}

/**
 * 정렬의 큐 순서대로 슬라이드 그룹·라벨 정보를 나열한다.
 *
 * 나열한 개수가 정렬의 길이와 맞지 않으면 섬네일과 어긋날 수 있으므로,
 * 그룹·라벨 정보가 없는 큐로 채워서 반환한다.
 */
export function getArrangementCues(
  presentation: PPresentation,
  arrangementUuid: string,
): PCue[] {
  const arrangement = findArrangement(presentation, arrangementUuid);
  const totalCues = arrangement
    ? arrangement.total_cues
    : presentation.total_cues;
  const groups = arrangement
    ? arrangement.groups.flatMap(
        (uuid) =>
          presentation.groups.find((group) => group.uuid === uuid) ?? [],
      )
    : presentation.groups;
  const cues = groups.flatMap((group) => {
    const name = group.name.normalize("NFC").trim();
    const groupName =
      group.color && !defaultGroupNames.has(name.toLowerCase()) ? name : "";

    return group.slides.map((slide): PCue => ({
      groupColor: group.color,
      groupName,
      label: slide.label.normalize("NFC"),
    }));
  });

  if (cues.length !== totalCues) {
    return Array.from({ length: totalCues }, (): PCue => ({}));
  }

  return cues;
}

/** 선택한 항목의 슬라이드를 PDF 페이지 순서대로 모은다. */
export async function collectSlidePages(
  baseUrl: string,
  selection: PSelection,
  quality: number,
  signal?: AbortSignal,
): Promise<PdfPageSource[]> {
  if (selection.type === "presentation") {
    const uuid = selection.id.uuid;
    const { presentation } = await getPresentationByUuid(baseUrl, uuid, signal);
    const cues = getArrangementCues(
      presentation,
      presentation.current_arrangement,
    );

    return cues.map((cue, cueIndex) => ({
      ...cue,
      imageUrl: getPresentationSlideThumbUrl(baseUrl, uuid, cueIndex, quality),
      pageNumber: cueIndex + 1,
      pageCount: cues.length,
      presentationName: presentation.id.name.normalize("NFC"),
    }));
  }

  const playlistId = selection.id.uuid;
  const playlist = await getPlaylistById(baseUrl, playlistId, signal);
  const pages: PdfPageSource[] = [];

  for (const item of playlist.items) {
    if (item.type !== "presentation") {
      // TODO: 헤더(헤더 페이지 생성 옵션), 연결하지 않은 플레이스홀더 처리
      continue;
    }

    const { presentation_uuid, arrangement_uuid } = item.presentation_info;
    const index = item.id.index;

    signal?.throwIfAborted();
    const { presentation } = await getPresentationByUuid(
      baseUrl,
      presentation_uuid,
      signal,
    );
    const cues = getArrangementCues(presentation, arrangement_uuid);

    for (let c = 0; c < cues.length; c += 1) {
      pages.push({
        ...cues[c],
        imageUrl: getPlaylistSlideThumbUrl(
          baseUrl,
          playlistId,
          index,
          c,
          quality,
        ),
        pageNumber: c + 1,
        pageCount: cues.length,
        presentationName: item.id.name.normalize("NFC"),
      });
    }
  }

  return pages;
}
