// TODO: ProPresenter 관련 타입 이름은 P로 시작하도록 변경.

export type Playlist = {
  id: ObjectId;
  items: PlaylistItem[];
};

type ObjectId = {
  uuid: string;
  name: string;
  index: number;
};

export type FocusedPlaylist = {
  playlist: ObjectId | null;
  item: ObjectId | null;
  playlist_item: PlaylistItem;
};

type PlaylistItem = PlaylistHeader | PlaylistPlaceholder | PlaylistPresentation;

type PlaylistItemBase = {
  id: ObjectId; // 주의: 프레젠테이션이 아니라 재생목록 항목의 ID임.
  is_hidden: boolean;
  is_pco: boolean;
};

type PlaylistHeader = PlaylistItemBase & {
  type: "header";
  header_color: {
    red: number;
    green: number;
    blue: number;
    alpha: number;
  };
  destination: "presentation";
};

type PlaylistPlaceholder = PlaylistItemBase & {
  type: "placeholder";
  destination: "presentation";
};

type PlaylistPresentation = PlaylistItemBase & {
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
  id: ObjectId;
  groups: string[]; // PGroup의 uuid를 순서대로 나열
  total_cues: number;
};

export type PPresentation = {
  id: ObjectId;
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
