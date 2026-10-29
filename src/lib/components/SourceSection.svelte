<script lang="ts">
  import CircleAlertIcon from "@lucide/svelte/icons/circle-alert";
  import RotateCwIcon from "@lucide/svelte/icons/rotate-cw";
  import { Badge } from "#lib/components/ui/badge/index.ts";
  import { Button } from "#lib/components/ui/button/index.ts";
  import { Input } from "#lib/components/ui/input/index.ts";
  import * as Marker from "#lib/components/ui/marker/index.ts";
  import * as Select from "#lib/components/ui/select/index.ts";
  import { Spinner } from "#lib/components/ui/spinner/index.ts";
  import * as Tabs from "#lib/components/ui/tabs/index.ts";
  import type { PObjectId, PPlaylistAll } from "#lib/types/pp.ts";
  import type { SourceTab } from "#lib/types/ui.ts";
  import type { PSelection } from "#lib/utils/pp.ts";
  import ListItemButton from "./ListItemButton.svelte";
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
    /** PDF 생성 중 등 선택을 바꾸지 못하게 할 때 `true`. */
    disabled: boolean;
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
    disabled,
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

  // `Select.Value`가 닫힌 상태에서도 선택한 이름을 표시하려면 `items`가 필요하다.
  const libraryItems = $derived(
    libraries.map((library) => ({ value: library.uuid, label: library.name })),
  );

  function handleLibraryChange(libraryId: string) {
    // 이미 선택한 라이브러리를 다시 고르면 목록을 새로 불러오지 않는다.
    if (libraryId === selectedLibraryId) {
      return;
    }

    filter = "";
    onlibrarychange(libraryId);
  }
</script>

<section>
  <!-- `disabled`이면 안에 있는 버튼과 입력란을 한꺼번에 비활성화한다. -->
  <fieldset class="flex min-w-0 flex-col gap-4" {disabled}>
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-lg font-semibold">재생목록·프레젠테이션 선택</h2>

      <div class="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={!connected || busy}
          onclick={onselectfocused}
        >
          ProPresenter에서 선택한 항목
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title="목록 다시 불러오기"
          aria-label="목록 다시 불러오기"
          disabled={!connected || busy}
          onclick={onreload}
        >
          {#if busy}
            <Spinner aria-hidden="true" />
          {:else}
            <RotateCwIcon aria-hidden="true" />
          {/if}
        </Button>
      </div>
    </div>

    <div class="flex flex-col gap-3">
      {#if !connected}
        <p class="py-6 text-center text-sm text-muted-foreground">
          먼저 ProPresenter에 연결하세요.
        </p>
      {:else}
        <Tabs.Root bind:value={tab}>
          <Tabs.List class="w-full">
            <Tabs.Trigger value="library">라이브러리</Tabs.Trigger>
            <Tabs.Trigger value="playlist">재생목록</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="library" class="flex flex-col gap-2">
            <Select.Root
              type="single"
              items={libraryItems}
              value={selectedLibraryId}
              onValueChange={handleLibraryChange}
              disabled={disabled || libraries.length === 0}
            >
              <Select.Trigger class="w-full" aria-label="라이브러리">
                <Select.Value
                  placeholder={libraries.length
                    ? "라이브러리 선택"
                    : "라이브러리 없음"}
                />
              </Select.Trigger>
              <Select.Content>
                <Select.Group>
                  {#each libraryItems as { value, label } (value)}
                    <Select.Item {value} {label}>{label}</Select.Item>
                  {/each}
                </Select.Group>
              </Select.Content>
            </Select.Root>

            {#if selectedLibraryId}
              <Input
                type="search"
                placeholder="프레젠테이션 이름으로 찾기"
                aria-label="프레젠테이션 이름으로 찾기"
                bind:value={filter}
              />

              <div class="h-72 overflow-y-auto rounded-lg border bg-background">
                {#if presentationsLoading}
                  <div class="flex h-full items-center justify-center">
                    <Spinner class="size-6" aria-label="불러오는 중" />
                  </div>
                {:else if filteredPresentations.length === 0}
                  <p class="p-4 text-center text-sm text-muted-foreground">
                    {presentations.length
                      ? "일치하는 프레젠테이션이 없습니다."
                      : "프레젠테이션이 없습니다."}
                  </p>
                {:else}
                  <ul class="p-1">
                    {#each filteredPresentations as item (item.uuid)}
                      <li>
                        <ListItemButton
                          selected={item.uuid === selectedPresentationUuid}
                          onclick={() =>
                            onselect({ type: "presentation", id: item })}
                        >
                          {item.name}
                        </ListItemButton>
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
            {/if}
          </Tabs.Content>

          <Tabs.Content
            value="playlist"
            class="h-72 overflow-y-auto rounded-lg border bg-background"
          >
            {#if playlists.length === 0}
              <p class="p-4 text-center text-sm text-muted-foreground">
                재생목록이 없습니다.
              </p>
            {:else}
              <ul class="p-1">
                <PlaylistTree
                  items={playlists}
                  selectedUuid={selectedPlaylistUuid}
                  onselect={(id) => onselect({ type: "playlist", id })}
                />
              </ul>
            {/if}
          </Tabs.Content>
        </Tabs.Root>
      {/if}

      {#if error}
        <!-- 오류 내용이 여러 줄일 수 있으므로 아이콘을 첫 줄에 맞춘다. -->
        <Marker.Root role="alert" class="items-start text-destructive">
          <Marker.Icon class="mt-0.5"><CircleAlertIcon /></Marker.Icon>
          <Marker.Content class="break-all whitespace-pre-line">
            {error}
          </Marker.Content>
        </Marker.Root>
      {/if}

      <div class="flex min-w-0 items-center gap-2 text-sm">
        {#if selection}
          {#if selection.type === "playlist"}
            <Badge class="bg-sky-100 text-sky-700">재생목록</Badge>
          {:else}
            <Badge class="bg-orange-100 text-orange-700">프레젠테이션</Badge>
          {/if}
          <span class="truncate font-medium" title={selection.id.name}>
            {selection.id.name}
          </span>
        {:else}
          <span class="text-muted-foreground">선택한 항목이 없습니다.</span>
        {/if}
      </div>
    </div>
  </fieldset>
</section>
