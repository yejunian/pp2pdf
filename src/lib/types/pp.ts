export type PPlaylistAll = (PPlaylistGroupItem | PPlaylistGroup)[];

type PPlaylistGroupItem = {
  id: PObjectId;
  field_type: "playlist";
  children: [];
};

type PPlaylistGroup = {
  id: PObjectId;
  field_type: "group";
  children: PPlaylistAll;
};

export type PPlaylist = {
  id: PObjectId;
  items: PPlaylistItem[];
};

export type PObjectId = {
  uuid: string;
  name: string;
  index: number;
};

export type PFocusedPlaylist = {
  playlist: PObjectId | null;
  item: PObjectId | null;
  playlist_item: PPlaylistItem;
};

type PPlaylistItem =
  PPlaylistHeader | PPlaylistPlaceholder | PPlaylistPresentation;

type PPlaylistItemBase = {
  id: PObjectId; // 주의: 프레젠테이션이 아니라 재생목록 항목의 ID임.
  is_hidden: boolean;
  is_pco: boolean;
};

type PPlaylistHeader = PPlaylistItemBase & {
  type: "header";
  header_color: {
    red: number;
    green: number;
    blue: number;
    alpha: number;
  };
  destination: "presentation";
};

type PPlaylistPlaceholder = PPlaylistItemBase & {
  type: "placeholder";
  destination: "presentation";
};

type PPlaylistPresentation = PPlaylistItemBase & {
  type: "presentation";
  duration?: number; // 6마다 1초(버림), 없으면 생략
  presentation_info: {
    presentation_uuid: string;
    arrangement_name: string; // 마스터 정렬이면 ""
    arrangement_uuid: string; // 마스터 정렬이면 ""
  };
  destination: "presentation" | "announcements";
};

type PColor = {
  red: number;
  green: number;
  blue: number;
  alpha: number;
};

type PGroup = {
  name: string;
  color: PColor;
  slides: PSlide[];
  uuid: string;
};

type PSlide = {
  enabled: boolean;
  notes: string;
  text: string;
  label: string;
  size: {
    width: number;
    height: number;
  };
};

type PArrangement = {
  id: PObjectId;
  groups: string[]; // PGroup의 uuid를 순서대로 나열
  total_cues: number;
};

export type PPresentation = {
  id: PObjectId;
  groups: PGroup[];
  has_timeline: boolean;
  presentation_path: string;
  destination: "presentation" | "announcements";
  arrangements: PArrangement[];
  current_arrangement: string; // 현재 선택된 정렬의 uuid
  type: string; // idk
  is_authorized: boolean;
  total_cues: number; // 마스터 정렬의 슬라이드 개수
};

export type PLibrary = {
  update_type: "all";
  items: PObjectId[];
};
