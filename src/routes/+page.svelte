<script lang="ts">
  import ConnectionCard from "$lib/components/ConnectionCard.svelte";
  import PdfOptionsCard from "$lib/components/PdfOptionsCard.svelte";
  import SourceCard from "$lib/components/SourceCard.svelte";
  import type { PObjectId, PPlaylistAll } from "$lib/types/pp";
  import type {
    ConnectionStatus,
    GenerationState,
    SourceTab,
  } from "$lib/types/ui";
  import {
    DEFAULT_PDF_OPTIONS,
    saveSlidesAsPdf,
    type PdfOptions,
  } from "$lib/utils/pdf";
  import { collectSlidePages, type PSelection } from "$lib/utils/pp";
  import {
    getFocusedPlaylist,
    getFocusedPresentation,
    getLibraryAll,
    getLibraryById,
    getPlaylistAll,
    makeBaseUrl,
  } from "$lib/utils/pp-requests";

  // 1. ProPresenter 연결
  let host = $state("localhost");
  let port = $state(50001);
  let connectionStatus = $state<ConnectionStatus>("idle");
  let baseUrl = $state("");
  let connectionError = $state("");

  // 2. 재생목록·프레젠테이션 선택
  let libraries: PObjectId[] = $state([]);
  let playlists: PPlaylistAll = $state([]);
  let selectedLibraryId = $state("");
  let presentations: PObjectId[] = $state([]);
  let presentationsLoading = $state(false);
  let sourceTab = $state<SourceTab>("library");
  let sourceBusy = $state(false);
  let sourceError = $state("");
  let selection = $state<PSelection | null>(null);

  // 3. PDF 생성 옵션
  let options: PdfOptions = $state({ ...DEFAULT_PDF_OPTIONS });
  let generation = $state<GenerationState>({ phase: "idle", result: null });
  let abortController: AbortController | null = null;

  const connected = $derived(connectionStatus === "connected");

  async function handleConnect() {
    const url = makeBaseUrl(host, port);

    baseUrl = url;
    connectionStatus = "connecting";
    connectionError = "";
    sourceError = "";
    libraries = [];
    playlists = [];
    selectedLibraryId = "";
    presentations = [];
    selection = null;

    try {
      [libraries, playlists] = await Promise.all([
        getLibraryAll(url),
        getPlaylistAll(url),
      ]);
      connectionStatus = "connected";
    } catch (error) {
      connectionStatus = "failed";
      connectionError = getErrorMessage(error);
    }
  }

  async function loadPresentations(libraryId: string) {
    presentationsLoading = true;
    sourceError = "";

    try {
      const library = await getLibraryById(baseUrl, libraryId);
      // 기다리는 동안 다른 라이브러리를 선택했으면 결과를 버린다.
      if (selectedLibraryId === libraryId) {
        presentations = library.items;
      }
    } catch (error) {
      if (selectedLibraryId === libraryId) {
        presentations = [];
        sourceError = getErrorMessage(error);
      }
    } finally {
      if (selectedLibraryId === libraryId) {
        presentationsLoading = false;
      }
    }
  }

  function handleLibraryChange(libraryId: string) {
    selectedLibraryId = libraryId;
    presentations = [];
    loadPresentations(libraryId);
  }

  function handleSelect(newSelection: PSelection) {
    selection = newSelection;
  }

  async function handleSelectFocused() {
    sourceBusy = true;
    sourceError = "";

    try {
      const focusedPlaylist = await getFocusedPlaylist(baseUrl);

      if (focusedPlaylist.playlist) {
        sourceTab = "playlist";
        handleSelect({ type: "playlist", id: focusedPlaylist.playlist });
        return;
      }

      // 재생목록 대신 단일 프레젠테이션이 선택된 경우
      const focusedPresentation = await getFocusedPresentation(baseUrl);

      if (focusedPresentation) {
        sourceTab = "library";
        handleSelect({ type: "presentation", id: focusedPresentation });
      } else {
        sourceError = "ProPresenter에서 선택한 항목을 찾지 못했습니다.";
      }
    } catch (error) {
      sourceError = getErrorMessage(error);
    } finally {
      sourceBusy = false;
    }
  }

  async function handleReload() {
    sourceBusy = true;
    sourceError = "";

    try {
      [libraries, playlists] = await Promise.all([
        getLibraryAll(baseUrl),
        getPlaylistAll(baseUrl),
      ]);

      if (
        selectedLibraryId &&
        !libraries.some((library) => library.uuid === selectedLibraryId)
      ) {
        selectedLibraryId = "";
        presentations = [];
      }
    } catch (error) {
      sourceError = getErrorMessage(error);
    } finally {
      sourceBusy = false;
    }

    if (selectedLibraryId) {
      await loadPresentations(selectedLibraryId);
    }
  }

  async function handleGenerate() {
    if (!selection) {
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    const title = (
      options.name.trim() ||
      selection.id.name.trim() ||
      "pp2pdf"
    ).normalize("NFC");
    const fileName = `${toSafeFileName(title)}.pdf`;
    const { imageSize, compression, backgroundColor, showGroupsAndLabels } =
      options;

    abortController = controller;
    generation = { phase: "collecting" };

    try {
      const pages = await collectSlidePages(
        baseUrl,
        selection,
        imageSize,
        signal,
      );

      // TODO: 헤더 페이지, 비활성 슬라이드 옵션 반영
      await saveSlidesAsPdf(pages, {
        fileName,
        title,
        compression,
        backgroundColor,
        showPresentationName: selection.type === "playlist",
        showGroupsAndLabels,
        signal,
        onProgress: (done, total) => {
          generation = { phase: "rendering", done, total };
        },
      });

      generation = {
        phase: "idle",
        result: {
          type: "success",
          message: `${fileName} 파일을 만들었습니다. (${pages.length}쪽)`,
        },
      };
    } catch (error) {
      generation = {
        phase: "idle",
        result: signal.aborted
          ? { type: "info", message: "PDF 생성을 취소했습니다." }
          : { type: "error", message: getErrorMessage(error) },
      };
    } finally {
      abortController = null;
    }
  }

  function handleCancel() {
    abortController?.abort();
  }

  function toSafeFileName(name: string): string {
    return name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_");
  }

  function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
</script>

<svelte:head><title>pp2pdf</title></svelte:head>

<main class="mx-auto max-w-5xl p-4 sm:p-6">
  <header class="mb-6">
    <h1 class="flex items-center gap-2 text-2xl font-bold">
      pp2pdf
      <span class="badge badge-ghost badge-sm">alpha</span>
    </h1>
    <p class="mt-1 text-sm text-base-content/70">
      ProPresenter의 재생목록 또는 프레젠테이션을 PDF 파일로 변환합니다.
    </p>
  </header>

  <div class="grid gap-6 lg:grid-cols-2 lg:items-start">
    <div class="min-w-0 space-y-6">
      <ConnectionCard
        bind:host
        bind:port
        status={connectionStatus}
        {baseUrl}
        error={connectionError}
        onconnect={handleConnect}
      />

      <SourceCard
        {connected}
        busy={sourceBusy}
        {libraries}
        {playlists}
        {selectedLibraryId}
        {presentations}
        {presentationsLoading}
        bind:tab={sourceTab}
        {selection}
        error={sourceError}
        onlibrarychange={handleLibraryChange}
        onselect={handleSelect}
        onselectfocused={handleSelectFocused}
        onreload={handleReload}
      />
    </div>

    <div class="min-w-0 lg:sticky lg:top-6">
      <PdfOptionsCard
        bind:options
        selectionName={selection?.id.name}
        selectionType={selection?.type}
        canGenerate={connected && selection !== null}
        {generation}
        ongenerate={handleGenerate}
        oncancel={handleCancel}
      />
    </div>
  </div>
</main>
