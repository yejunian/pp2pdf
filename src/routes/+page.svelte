<script lang="ts">
  import ConnectionSection from "#lib/components/ConnectionSection.svelte";
  import PdfOptionsSection from "#lib/components/PdfOptionsSection.svelte";
  import SourceSection from "#lib/components/SourceSection.svelte";
  import { Badge } from "#lib/components/ui/badge/index.ts";
  import type { PObjectId, PPlaylistAll } from "#lib/types/pp.ts";
  import type {
    ConnectionStatus,
    GenerationState,
    SourceTab,
  } from "#lib/types/ui.ts";
  import {
    DEFAULT_PDF_OPTIONS,
    saveSlidesAsPdf,
    type PdfOptions,
  } from "#lib/utils/pdf.ts";
  import {
    collectSlidePages,
    getFocusedSelection,
    type PSelection,
  } from "#lib/utils/pp.ts";
  import {
    getLibraryAll,
    getLibraryById,
    getPlaylistAll,
    makeBaseUrl,
  } from "#lib/utils/pp-requests.ts";

  // 1. ProPresenter 연결
  let host = $state("localhost");
  let port = $state(50001);
  let connectionStatus = $state<ConnectionStatus>("idle");
  let baseUrl = $state("");
  let connectionError = $state("");
  // 마지막으로 연결에 성공한 기준 URL과, 그 연결에서 선택했던 라이브러리·항목.
  // 다른 주소에 처음 연결했는지 판단하고, 같은 주소로 다시 연결할 때 선택을
  // 되살리는 데 쓴다.
  let lastConnectedUrl = "";
  let lastLibraryId = "";
  let lastSelection: PSelection | null = null;

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
  // PDF를 만드는 동안에는 연결과 선택을 바꾸지 못하게 한다.
  const generating = $derived(generation.phase !== "idle");

  async function handleConnect() {
    const url = makeBaseUrl(host, port);
    // 페이지를 연 뒤 처음 연결하거나 마지막으로 연결한 곳과 다른 주소·포트에
    // 연결하면, ProPresenter에서 선택한 항목을 자동으로 선택한다.
    // 같은 주소로 다시 연결하면 직전에 선택했던 라이브러리와 항목을 되살린다.
    const isNewAddress = url !== lastConnectedUrl;

    // 연결에 실패한 상태에서는 화면의 선택이 이미 지워졌으므로 기억해 둔 선택을
    // 덮어쓰지 않는다.
    if (connectionStatus === "connected") {
      lastLibraryId = selectedLibraryId;
      lastSelection = selection;
    }

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
      const [newLibraries, newPlaylists, focused] = await Promise.all([
        getLibraryAll(url),
        getPlaylistAll(url),
        // 자동 선택은 실패해도 연결 결과에 영향을 주지 않고 오류도 표시하지 않는다.
        isNewAddress ? getFocusedSelection(url).catch(() => null) : null,
      ]);

      libraries = newLibraries;
      playlists = newPlaylists;
      lastConnectedUrl = url;
      connectionStatus = "connected";

      if (isNewAddress) {
        if (focused) {
          selectFocused(focused);
        }
      } else {
        restoreLastSelection();
      }
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

  /**
   * 같은 주소로 다시 연결했을 때 직전 선택을 되살린다. 라이브러리는 아직 있을
   * 때만 되살린다(ProPresenter를 다시 시작하면 라이브러리 UUID가 바뀐다).
   * 항목은 `handleReload`와 마찬가지로 아직 있는지 확인하지 않는다.
   */
  function restoreLastSelection() {
    if (libraries.some((library) => library.uuid === lastLibraryId)) {
      handleLibraryChange(lastLibraryId);
    }

    selection = lastSelection;
  }

  /** ProPresenter에서 선택한 항목을 선택하고, 그 항목의 종류에 맞는 탭을 연다. */
  function selectFocused(focused: PSelection) {
    sourceTab = focused.type === "playlist" ? "playlist" : "library";
    handleSelect(focused);
  }

  async function handleSelectFocused() {
    sourceBusy = true;
    sourceError = "";

    try {
      const focused = await getFocusedSelection(baseUrl);

      if (focused) {
        selectFocused(focused);
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
        imageSize,
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
  <header class="mb-10">
    <h1 class="flex items-center gap-2 text-2xl font-bold">
      pp2pdf
      <Badge variant="secondary">beta</Badge>
    </h1>
    <p class="mt-1 text-sm text-muted-foreground">
      ProPresenter의 재생목록 또는 프레젠테이션을 PDF 파일로 변환합니다.
    </p>
  </header>

  <div class="grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-16">
    <div class="flex min-w-0 flex-col gap-12">
      <ConnectionSection
        bind:host
        bind:port
        status={connectionStatus}
        {baseUrl}
        error={connectionError}
        disabled={generating}
        onconnect={handleConnect}
      />

      <SourceSection
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
        disabled={generating}
        onlibrarychange={handleLibraryChange}
        onselect={handleSelect}
        onselectfocused={handleSelectFocused}
        onreload={handleReload}
      />
    </div>

    <div class="min-w-0 lg:sticky lg:top-6">
      <PdfOptionsSection
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
