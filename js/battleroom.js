// js/battleroom.js
import { auth, db } from "./firebase.js";
import { onAuthStateChanged }
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  deleteField,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const roomRef = doc(db, "rooms", ROOM_ID);
let myUid = null;
let myNickname = null;

function calcMySlot(room) {
    if (!room || !myUid) return null;
    if (room.player1_uid === myUid) return "player1";
    if (room.player2_uid === myUid) return "player2";
    if ((room.spectators ?? []).includes(myUid)) return "spectator";
    return null;
}

function slotLabel(slot) {
    if (slot === "player1") return "Player1";
    if (slot === "player2") return "Player2";
    return "관전자";
}

onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    myUid = user.uid;

    const userSnap = await getDoc(doc(db, "users", myUid));
    const userData = userSnap.data();
    myNickname = userData.nickname;

    await joinRoom();
    listenRoom();
    setupButtons();
});

async function joinRoom() {
    const roomSnap = await getDoc(roomRef);
    const room = roomSnap.data();

    if (calcMySlot(room)) return;

    if (room.game_started) {
        await joinAsSpectator(room);
        return;
    }

    if (!room.player1_uid) {
        await updateDoc(roomRef, { player1_uid: myUid, player1_name: myNickname });
    } else if (!room.player2_uid) {
        await updateDoc(roomRef, { player2_uid: myUid, player2_name: myNickname });
    } else {
        await joinAsSpectator(room);
    }
}

async function joinAsSpectator(room) {
    const spectators = room.spectators ?? [];
    if (spectators.includes(myUid)) return;

    await updateDoc(roomRef, {
        spectators: [...spectators, myUid],
        spectator_names: [...(room.spectator_names ?? []), myNickname]
    });
}

function listenRoom() {
    onSnapshot(roomRef, async (snap) => {
        const room = snap.data();
        if (!room) return;

        const mySlot = calcMySlot(room);

        renderPlayers(room, mySlot);
        renderSpectators(room, mySlot);
        renderSwapStatus(room);
        updateButtonsBySlot(room, mySlot);

        if (room.player1_ready && room.player2_ready && !room.game_started) {
            if (mySlot === "player1" || mySlot === "player2") {
                const firestoreSlot = mySlot === "player1" ? "p1" : "p2";
                const userSnap = await getDoc(doc(db, "users", myUid));
                const myEntry = userSnap.data()?.entry ?? [];
                const myEntryWithMax = myEntry.map(pkmn => ({ ...pkmn, maxHp: pkmn.hp }));

                await updateDoc(roomRef, {
                    [`${firestoreSlot}_entry`]: myEntryWithMax,
                    [`${firestoreSlot}_active_idx`]: 0,
                });

                if (mySlot === "player1") {
                    await updateDoc(roomRef, { game_started: true, game_started_at: Date.now() });
                }
            }
        }

        if (room.game_started && mySlot) {
            const roomNumber = ROOM_ID.replace("battleroom", "");
            if (mySlot === "spectator") {
                location.href = `../games/battleroom${roomNumber}.html?spectator=true`;
            } else {
                location.href = `../games/battleroom${roomNumber}.html`;
            }
        }
    });
}

function updateButtonsBySlot(room, mySlot) {
    const isPlayer = mySlot === "player1" || mySlot === "player2";

    const readyBtn = document.getElementById("readyBtn");
    const leaveBtn = document.getElementById("leaveBtn");

    if (readyBtn) readyBtn.style.display = isPlayer ? "inline-block" : "none";
    if (readyBtn) readyBtn.disabled = !!room.swap_request;
    if (leaveBtn) leaveBtn.disabled = isPlayer && !!room.game_started;
}

function renderPlayers(room, mySlot) {
    renderPlayerRow("player1", room, mySlot);
    renderPlayerRow("player2", room, mySlot);
}

function renderPlayerRow(slot, room, mySlot) {
    const el = document.getElementById(slot);
    if (!el) return;

    const uid = room[`${slot}_uid`];
    const name = room[`${slot}_name`];

    el.innerHTML = "";
    el.append(`${slotLabel(slot)}: ${name ?? "대기"}`);

    const canRequest = mySlot === "spectator" && uid && !room.swap_request && !room.game_started;
    if (canRequest) {
        const btn = document.createElement("button");
        btn.textContent = "교체 요청";
        btn.onclick = () => requestSwap(slot, uid, name);
        el.appendChild(btn);
    }
}

function renderSpectators(room, mySlot) {
    const el = document.getElementById("spectator-list");
    if (!el) return;

    const uids = room.spectators ?? [];
    const names = room.spectator_names ?? [];

    el.innerHTML = "";

    if (uids.length === 0) {
        el.append("관전자: 없음");
        return;
    }

    el.append("관전자: ");

    const isPlayer = mySlot === "player1" || mySlot === "player2";
    const canRequest = isPlayer && !room.swap_request && !room.game_started;

    uids.forEach((uid, i) => {
        const span = document.createElement("span");
        span.textContent = names[i] + " ";
        el.appendChild(span);

        if (canRequest) {
            const btn = document.createElement("button");
            btn.textContent = "교체 요청";
            btn.onclick = () => requestSwap("spectator", uid, names[i]);
            el.appendChild(btn);
        }
    });
}

function renderSwapStatus(room) {
    const el = document.getElementById("swap-status");
    if (!el) return;

    el.innerHTML = "";

    const req = room.swap_request;
    if (!req) return;

    if (req.toUid === myUid) {
        el.append(`${req.fromName}님이 ${slotLabel(req.fromSlot)} 자리와의 교체를 요청했습니다.`);
        const acceptBtn = document.createElement("button");
        acceptBtn.textContent = "수락";
        acceptBtn.onclick = () => respondSwap(true);
        const rejectBtn = document.createElement("button");
        rejectBtn.textContent = "거절";
        rejectBtn.onclick = () => respondSwap(false);
        el.appendChild(acceptBtn);
        el.appendChild(rejectBtn);
    } else if (req.fromUid === myUid) {
        el.append(`${req.toName}님에게 교체를 요청했습니다. 응답을 기다리는 중...`);
        const cancelBtn = document.createElement("button");
        cancelBtn.textContent = "요청 취소";
        cancelBtn.onclick = () => cancelSwap();
        el.appendChild(cancelBtn);
    } else {
        el.append(`${req.fromName}님이 ${req.toName}님에게 교체를 요청했습니다.`);
    }
}

async function requestSwap(toSlot, toUid, toName) {
    const roomSnap = await getDoc(roomRef);
    const room = roomSnap.data();
    if (!room || room.game_started || room.swap_request) return;

    const mySlot = calcMySlot(room);
    if (!mySlot || mySlot === toSlot) return;
    if (mySlot !== "spectator" && toSlot !== "spectator") return;

    await updateDoc(roomRef, {
        swap_request: {
            fromUid: myUid,
            fromName: myNickname,
            fromSlot: mySlot,
            toUid,
            toName,
            toSlot,
        }
    });
}

async function cancelSwap() {
    const roomSnap = await getDoc(roomRef);
    const room = roomSnap.data();
    const req = room?.swap_request;
    if (!req || req.fromUid !== myUid) return;

    await updateDoc(roomRef, { swap_request: deleteField() });
}

async function respondSwap(accepted) {
    const roomSnap = await getDoc(roomRef);
    const room = roomSnap.data();
    const req = room?.swap_request;
    if (!req || req.toUid !== myUid) return;

    if (!accepted) {
        await updateDoc(roomRef, { swap_request: deleteField() });
        return;
    }

    let playerSlot, playerUid, playerName, spectatorUid, spectatorName;
    if (req.fromSlot === "spectator") {
        spectatorUid = req.fromUid;
        spectatorName = req.fromName;
        playerSlot = req.toSlot;
        playerUid = req.toUid;
        playerName = req.toName;
    } else {
        playerSlot = req.fromSlot;
        playerUid = req.fromUid;
        playerName = req.fromName;
        spectatorUid = req.toUid;
        spectatorName = req.toName;
    }

    const spectators = room.spectators ?? [];
    const spectatorNames = room.spectator_names ?? [];
    const idx = spectators.indexOf(spectatorUid);

    if (idx === -1 || room[`${playerSlot}_uid`] !== playerUid) {
        await updateDoc(roomRef, { swap_request: deleteField() });
        return;
    }

    const newSpectators = [...spectators];
    const newSpectatorNames = [...spectatorNames];
    newSpectators[idx] = playerUid;
    newSpectatorNames[idx] = playerName;

    await updateDoc(roomRef, {
        [`${playerSlot}_uid`]: spectatorUid,
        [`${playerSlot}_name`]: spectatorName,
        [`${playerSlot}_ready`]: false,
        spectators: newSpectators,
        spectator_names: newSpectatorNames,
        swap_request: deleteField(),
    });
}

function setupButtons() {
  document.getElementById("readyBtn").onclick = async () => {
    const roomSnap = await getDoc(roomRef);
    const mySlot = calcMySlot(roomSnap.data());
    if (mySlot === "player1") await updateDoc(roomRef, { player1_ready: true });
    if (mySlot === "player2") await updateDoc(roomRef, { player2_ready: true });
  };

  document.getElementById("leaveBtn").onclick = async () => {
    const roomSnap = await getDoc(roomRef);
    const room = roomSnap.data();
    const mySlot = calcMySlot(room);
    const isPlayer = mySlot === "player1" || mySlot === "player2";

    if (isPlayer && room.game_started) {
      return;
    }
    await leaveRoom(mySlot, room);
  };
}

async function leaveRoom(mySlot, room) {
    const req = room.swap_request;
    const swapClear = req && (req.fromUid === myUid || req.toUid === myUid)
        ? { swap_request: deleteField() }
        : {};

    if (mySlot === "player1" || mySlot === "player2") {
        const spectators = room.spectators ?? [];
        const spectatorNames = room.spectator_names ?? [];

        if (spectators.length > 0) {
            const randIdx = Math.floor(Math.random() * spectators.length);
            await updateDoc(roomRef, {
                [`${mySlot}_uid`]: spectators[randIdx],
                [`${mySlot}_name`]: spectatorNames[randIdx],
                [`${mySlot}_ready`]: false,
                spectators: spectators.filter((_, i) => i !== randIdx),
                spectator_names: spectatorNames.filter((_, i) => i !== randIdx),
                ...swapClear
            });
        } else {
            await updateDoc(roomRef, {
                [`${mySlot}_uid`]: null,
                [`${mySlot}_name`]: null,
                [`${mySlot}_ready`]: false,
                ...swapClear
            });
        }
    } else {
        await updateDoc(roomRef, {
            spectators: (room.spectators ?? []).filter(u => u !== myUid),
            spectator_names: (room.spectator_names ?? []).filter(n => n !== myNickname),
            ...swapClear
        });
    }
    location.href = "../main.html";
}
