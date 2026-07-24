<script lang="ts">
  import type { PPlaylist } from "$lib/types/pp";
  import {
    getFocusedPlaylist,
    getPlaylistById,
    getPlaylistSlideThumbUrl,
    getPresentationByUuid,
  } from "$lib/utils/pp-requests";
  import { saveImagesAsPdf } from "$lib/utils/pdf";

  const focusedPlaylistURL = "http://localhost:50001/v1/playlist/focused";

  let playlistState: PPlaylist | undefined = $state(); // XXX
  let thumbs: string[] = $state([]);
  let isSavingPdf = $state(false); // XXX

  async function handleSavePdfClick() {
    isSavingPdf = true; // XXX
    try {
      await saveImagesAsPdf(thumbs, { width: 960, height: 540 });
    } finally {
      isSavingPdf = false; // XXX
    }
  }

  async function handleButtonClick() {
    const focusedPlaylist = await getFocusedPlaylist();

    if (!focusedPlaylist.playlist) {
      // TODO: 재생목록 대신 단일 프레젠테이션이 선택된 경우
      // 해당 프레젠테이션의 섬네일 추출
      return;
    }

    const playlistId = focusedPlaylist.playlist.uuid;
    const playlist = await getPlaylistById(playlistId);
    playlistState = playlist; // XXX

    for (const item of playlist.items) {
      // TODO: 재생목록 루프 돌면서 부가정보(프레젠테이션별 길이 등)를
      // 기록해야 할 수도 있음.

      if (item.type !== "presentation") {
        // TODO: 헤더, 연결하지 않은 플레이스홀더 처리
        continue;
      }

      const presentationUuid = item.presentation_info.presentation_uuid;
      const arrangementUuid = item.presentation_info.arrangement_uuid;
      const index = item.id.index;

      const { presentation } = await getPresentationByUuid(presentationUuid);

      const total_cues = arrangementUuid
        ? (presentation.arrangements.find(
            (arrangement) => arrangement.id.uuid === arrangementUuid,
          )?.total_cues ?? 0)
        : presentation.total_cues;

      for (let c = 0; c < total_cues; c += 1) {
        thumbs.push(await getPlaylistSlideThumbUrl(playlistId, index, c, 960));
      }
    }
  }
</script>

<h1 class="text-2xl font-bold">pp2pdf <small>(alpha)</small></h1>

<div>
  <button
    type="button"
    onclick={handleButtonClick}
    class="cursor-pointer rounded bg-sky-500 text-white"
  >
    현재 재생목록 가져오기
  </button>
</div>

{#if playlistState}
  <hr />
  <h2>{playlistState.id.name} <code>{playlistState.id.uuid}</code></h2>
  <ol>
    {#each playlistState.items as item, index (item.id.uuid)}
      <li>{index}. {item.id.name}</li>
    {/each}
  </ol>
{/if}

{#if thumbs.length > 0}
  <hr />
  <div>{thumbs.length}개 이미지</div>
  <div>
    <button
      type="button"
      onclick={handleSavePdfClick}
      disabled={isSavingPdf}
      class="cursor-pointer rounded bg-sky-500 text-white"
    >
      {isSavingPdf ? "PDF 저장 중..." : "슬라이드 이미지를 PDF로 저장하기"}
    </button>
  </div>
{/if}
