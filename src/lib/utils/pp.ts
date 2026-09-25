import type { PObjectId, PPresentation } from "$lib/types/pp";
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

export function getArrangementLength(
  presentation: PPresentation,
  arrangementUuid: string,
): number {
  const current = presentation.arrangements.find(
    (arrangement) => arrangement.id.uuid === arrangementUuid,
  );

  // 1. uuid가 arrangementUuid와 일치하는 항목이 없으면 마스터 정렬
  if (!current) {
    return presentation.total_cues;
  }

  // 2. [win] name이 "", index가 0, groups가 [], total_cues가 0이면 마스터
  if (
    !current.id?.name &&
    !current.id?.index &&
    !current.groups?.length &&
    !current.total_cues
  ) {
    return presentation.total_cues;
  }

  // 3. 그 외: 일치하는 항목
  return current.total_cues;
}

/** 선택한 항목의 슬라이드 이미지 URL을 순서대로 모은다. */
export async function collectSlideImageUrls(
  baseUrl: string,
  selection: PSelection,
  quality: number,
  signal?: AbortSignal,
): Promise<string[]> {
  if (selection.type === "presentation") {
    const uuid = selection.id.uuid;
    const { presentation } = await getPresentationByUuid(baseUrl, uuid, signal);
    const totalCues = getArrangementLength(
      presentation,
      presentation.current_arrangement,
    );

    return Array.from({ length: totalCues }, (_, cueIndex) =>
      getPresentationSlideThumbUrl(baseUrl, uuid, cueIndex, quality),
    );
  }

  const playlistId = selection.id.uuid;
  const playlist = await getPlaylistById(baseUrl, playlistId, signal);
  const urls: string[] = [];

  for (const item of playlist.items) {
    // TODO: 재생목록 루프 돌면서 부가정보(프레젠테이션별 길이 등)를
    // 기록해야 할 수도 있음.

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
    const totalCues = getArrangementLength(presentation, arrangement_uuid);

    for (let c = 0; c < totalCues; c += 1) {
      urls.push(
        getPlaylistSlideThumbUrl(baseUrl, playlistId, index, c, quality),
      );
    }
  }

  return urls;
}
