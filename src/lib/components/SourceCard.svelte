<script lang="ts">
  import type { PObjectId, PPlaylistAll } from "$lib/types/pp";
  import type { SourceTab } from "$lib/types/ui";
  import type { PSelection } from "$lib/utils/pp";
  import PlaylistTree from "./PlaylistTree.svelte";

  interface Props {
    connected: boolean;
    /** 목록 새로 고침, 선택 항목 가져오기 등 요청 중인지 여부. */
    busy: boolean;
    libraries: PObjectId[];
    playlists: PPlaylistAll;
    selectedLibraryId: string;
    presentations: PObjectId[];
    presentationsLoading: boolean;
    tab: SourceTab;
    selection: PSelection | null;
    error: string;
    onlibrarychange: (id: string) => void;
    onselect: (selection: PSelection) => void;
    onselectfocused: () => void;
    onreload: () => void;
  }

  let {
    connected,
    busy,
    libraries,
    playlists,
    selectedLibraryId,
    presentations,
    presentationsLoading,
    tab = $bindable(),
    selection,
    error,
    onlibrarychange,
    onselect,
    onselectfocused,
    onreload,
  }: Props = $props();

  let filter = $state("");

  const filteredPresentations = $derived.by(() => {
    const keyword = filter.trim().toLocaleLowerCase();
    return keyword
      ? presentations.filter((item) =>
          item.name.toLocaleLowerCase().includes(keyword),
        )
      : presentations;
  });

  const selectedPresentationUuid = $derived(
    selection?.type === "presentation" ? selection.id.uuid : undefined,
  );
  const selectedPlaylistUuid = $derived(
    selection?.type === "playlist" ? selection.id.uuid : undefined,
  );

  function handleLibraryChange(event: Event) {
    filter = "";
    onlibrarychange((event.currentTarget as HTMLSelectElement).value);
  }
</script>

<section class="card card-border">
  <div class="card-body">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="card-title">재생목록·프레젠테이션 선택</h2>

      <div class="flex gap-1">
        <button
          type="button"
          class="btn btn-sm"
          disabled={!connected || busy}
          onclick={onselectfocused}
        >
          ProPresenter에서 선택한 항목
        </button>
        <button
          type="button"
          class="btn btn-square btn-ghost btn-sm"
          title="목록 다시 불러오기"
          aria-label="목록 다시 불러오기"
          disabled={!connected || busy}
          onclick={onreload}
        >
          {#if busy}
            <span class="loading loading-xs loading-spinner"></span>
          {:else}
            <span aria-hidden="true" class="text-lg">↻</span>
          {/if}
        </button>
      </div>
    </div>

    {#if !connected}
      <p class="py-6 text-center text-sm text-base-content/60">
        먼저 ProPresenter에 연결하세요.
      </p>
    {:else}
      <div role="tablist" class="tabs tabs-border">
        <button
          type="button"
          role="tab"
          class={["tab", tab === "library" && "tab-active"]}
          aria-selected={tab === "library"}
          onclick={() => (tab = "library")}
        >
          라이브러리
        </button>
        <button
          type="button"
          role="tab"
          class={["tab", tab === "playlist" && "tab-active"]}
          aria-selected={tab === "playlist"}
          onclick={() => (tab = "playlist")}
        >
          재생목록
        </button>
      </div>

      {#if tab === "library"}
        <div class="space-y-2" role="tabpanel">
          <select
            class="select w-full"
            aria-label="라이브러리"
            value={selectedLibraryId}
            onchange={handleLibraryChange}
          >
            <option value="" disabled>
              {libraries.length ? "라이브러리 선택" : "라이브러리 없음"}
            </option>
            {#each libraries as library (library.uuid)}
              <option value={library.uuid}>{library.name}</option>
            {/each}
          </select>

          {#if selectedLibraryId}
            <input
              type="search"
              class="input w-full input-sm"
              placeholder="프레젠테이션 이름으로 찾기"
              aria-label="프레젠테이션 이름으로 찾기"
              bind:value={filter}
            />

            <div
              class="h-72 overflow-y-auto rounded-box border border-base-300 bg-base-100"
            >
              {#if presentationsLoading}
                <div class="flex h-full items-center justify-center">
                  <span class="loading loading-spinner"></span>
                </div>
              {:else if filteredPresentations.length === 0}
                <p class="p-4 text-center text-sm text-base-content/60">
                  {presentations.length
                    ? "일치하는 프레젠테이션이 없습니다."
                    : "프레젠테이션이 없습니다."}
                </p>
              {:else}
                <ul class="menu w-full">
                  {#each filteredPresentations as item (item.uuid)}
                    <li>
                      <button
                        type="button"
                        class={{
                          "menu-active": item.uuid === selectedPresentationUuid,
                        }}
                        aria-pressed={item.uuid === selectedPresentationUuid}
                        onclick={() =>
                          onselect({ type: "presentation", id: item })}
                      >
                        {item.name}
                      </button>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          {/if}
        </div>
      {:else}
        <div
          class="h-72 overflow-y-auto rounded-box border border-base-300 bg-base-100"
          role="tabpanel"
        >
          {#if playlists.length === 0}
            <p class="p-4 text-center text-sm text-base-content/60">
              재생목록이 없습니다.
            </p>
          {:else}
            <ul class="menu w-full">
              <PlaylistTree
                items={playlists}
                selectedUuid={selectedPlaylistUuid}
                onselect={(id) => onselect({ type: "playlist", id })}
              />
            </ul>
          {/if}
        </div>
      {/if}
    {/if}

    {#if error}
      <div role="alert" class="alert alert-soft text-sm alert-error">
        <span class="break-all whitespace-pre-line">{error}</span>
      </div>
    {/if}

    <div class="flex min-w-0 items-center gap-2 text-sm">
      {#if selection}
        {#if selection.type === "playlist"}
          <span class="badge shrink-0 badge-outline badge-primary">
            재생목록
          </span>
        {:else}
          <span
            class="badge shrink-0 badge-outline border-orange-600 text-orange-600"
          >
            프레젠테이션
          </span>
        {/if}
        <span class="truncate font-medium" title={selection.id.name}>
          {selection.id.name}
        </span>
      {:else}
        <span class="text-base-content/60">선택한 항목이 없습니다.</span>
      {/if}
    </div>
  </div>
</section>
