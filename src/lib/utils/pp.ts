import type { PPresentation } from "$lib/types/pp";

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
