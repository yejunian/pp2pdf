<script lang="ts">
  import type { PPlaylist, PPlaylistAll } from "$lib/types/pp";
  import {
    getFocusedPlaylist,
    getPlaylistAll,
    getPlaylistById,
    getPlaylistSlideThumbUrl,
    getPresentationByUuid,
  } from "$lib/utils/pp-requests";
  import { saveImagesAsPdf } from "$lib/utils/pdf";
  import { getArrangementLength } from "$lib/utils/pp";

  let playlistAll: PPlaylistAll = $state([]);
  let playlistState: PPlaylist | undefined = $state(); // XXX
  let thumbs: string[] = $state([]);
  let isSavingPdf = $state(false); // XXX
  let selected = $state("selected-playlist");

  async function handleSavePdfClick() {
    isSavingPdf = true; // XXX
    try {
      await saveImagesAsPdf(thumbs, { width: 960, height: 540 });
    } finally {
      isSavingPdf = false; // XXX
    }
  }

  async function handleReloadListClick() {
    playlistAll = await getPlaylistAll();
  }

  async function handleFetchSelectedClick() {
    let playlistId = "";

    if (selected !== "selected-playlist") {
      playlistId = selected;
    } else {
      const focusedPlaylist = await getFocusedPlaylist();

      if (!focusedPlaylist.playlist) {
        // TODO: 재생목록 대신 단일 프레젠테이션이 선택된 경우
        // 해당 프레젠테이션의 섬네일 추출
        return;
      }

      playlistId = focusedPlaylist.playlist.uuid;
    }
    const focusedPlaylist = await getFocusedPlaylist();

    if (!focusedPlaylist.playlist) {
      // TODO: 재생목록 대신 단일 프레젠테이션이 선택된 경우
      // 해당 프레젠테이션의 섬네일 추출
      return;
    }

    const playlist = await getPlaylistById(playlistId);
    playlistState = playlist; // XXX

    for (const item of playlist.items) {
      // TODO: 재생목록 루프 돌면서 부가정보(프레젠테이션별 길이 등)를
      // 기록해야 할 수도 있음.

      if (item.type !== "presentation") {
        // TODO: 헤더, 연결하지 않은 플레이스홀더 처리
        continue;
      }

      const { presentation_uuid, arrangement_uuid } = item.presentation_info;
      const index = item.id.index;

      const { presentation } = await getPresentationByUuid(presentation_uuid);
      const total_cues = getArrangementLength(presentation, arrangement_uuid);

      for (let c = 0; c < total_cues; c += 1) {
        thumbs.push(await getPlaylistSlideThumbUrl(playlistId, index, c, 960));
      }
    }
  }
</script>

<h1 class="mb-3 border-b border-gray-300 pb-3 text-2xl font-bold">
  pp2pdf <small>(alpha)</small>
</h1>

<div class="mb-3 space-y-3 border-b border-gray-300 pb-3">
  <div class="flex gap-3">
    <select
      bind:value={selected}
      class="h-10 max-w-full cursor-pointer rounded border border-gray-700 px-4 hover:bg-gray-100"
    >
      <option value="selected-playlist">ProPresenter에서 선택한 항목</option>

      <hr />

      {#if playlistAll.length}
        <option disabled>재생목록</option>
      {:else}
        <option disabled>재생목록 없음</option>
      {/if}

      {#each playlistAll as item (item.id.uuid)}
        {#if item.field_type === "group"}
          <optgroup label={item.id.name}>
            {#each item.children as innerItem (innerItem.id.uuid)}
              <option
                value={innerItem.id.uuid}
                disabled={innerItem.field_type === "group"}
              >
                {innerItem.id.name}
              </option>
            {/each}
          </optgroup>
        {:else}
          <option value={item.id.uuid}>{item.id.name}</option>
        {/if}
      {/each}
    </select>

    <button
      type="button"
      onclick={handleReloadListClick}
      class="h-10 w-10 cursor-pointer rounded border border-transparent text-2xl text-gray-500 hover:bg-gray-200"
      title="목록 새로 다시 불러오기"
    >
      ♺
    </button>

    <button
      type="button"
      onclick={handleFetchSelectedClick}
      class="h-10 cursor-pointer rounded border border-sky-700 bg-sky-700 px-6 font-bold text-white hover:border-sky-600 hover:bg-sky-600"
    >
      가져오기
    </button>
  </div>
</div>

<div>
  {#if playlistState}
    <h2 class="text-xl font-bold">
      {playlistState.id.name}
      <code
        class="ml-1 text-sm font-normal before:content-['('] after:content-[')']"
      >
        {playlistState.id.uuid}
      </code>
    </h2>
    <ol>
      {#each playlistState.items as item, index (item.id.uuid)}
        {#if item.type === "header"}
          <li
            class="flex items-baseline gap-1 font-bold text-white"
            style={`background-color: rgba(${item.header_color.red * 255}, ${item.header_color.green * 255}, ${item.header_color.blue * 255}, ${item.header_color.alpha});`}
          >
            <code class="text-sm">[Hd]</code>
            <code class="text-sm">
              {index.toString().padStart(2, "\xa0")}.
            </code>
            <span>
              {item.id.name}
            </span>
          </li>
        {:else}
          <li class="flex items-baseline gap-1">
            <code class="text-sm">
              [{item.type[0].toUpperCase() + item.type[1]}]
            </code>
            <code class="text-sm">
              {index.toString().padStart(2, "\xa0")}.
            </code>
            <span>
              {item.id.name}
            </span>
          </li>
        {/if}
      {/each}
    </ol>
  {/if}

  {#if thumbs.length > 0}
    <div>
      <button
        type="button"
        onclick={handleSavePdfClick}
        disabled={isSavingPdf}
        class="hover-border-sky-600 h-10 cursor-pointer rounded border border-sky-700 bg-sky-700 px-6 font-bold text-white hover:bg-sky-600"
      >
        {isSavingPdf
          ? "PDF 저장 중..."
          : `슬라이드 이미지 ${thumbs.length}개를 PDF로 저장하기`}
      </button>
    </div>
  {/if}
</div>
