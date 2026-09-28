// js/rooms.js
// 배틀룸 목록과 방 상태 판정. 메인(main.js)과 대기실(battleroom.js)이 같이 쓴다.
// bg는 img/ 폴더 기준 파일 이름 (없으면 기본 그라데이션)
export const ROOMS = [
  { id: "battleroom1", no: 1, name: "철거 예정 구역의 빈 골목", bg: "골목.jpg" },
  { id: "battleroom2", no: 2, name: "폐쇄된 건물 옆 공터", bg: "공터.jpg" },
  { id: "battleroom3", no: 3, name: "배틀룸 3", bg: null },
];

export function roomInfo(roomId) {
  return ROOMS.find((r) => r.id === roomId);
}

// imgBase: 페이지 위치에서 img 폴더까지의 경로 ("img/" 또는 "../img/")
export function roomBgStyle(info, imgBase) {
  return info?.bg ? `url("${imgBase}${info.bg}")` : "";
}

// 방 문서 -> { key, label }
// battle_winner가 있으면 종료(누군가 LEAVE하기 전까지 유지), game_started면 진행 중, 그 외 대기 중
export function roomStatus(room) {
  if (!room) return { key: "closed", label: "준비 중" };
  if (room.battle_winner) return { key: "ended", label: "게임 종료" };
  if (room.game_started) return { key: "playing", label: "게임 중" };
  return { key: "waiting", label: "대기 중" };
}
