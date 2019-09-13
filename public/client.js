"use strict";

(function() {
  let socket,
    buttonReady,
    buttonThrow,
    countdownMain,
    countdownLocal,
    message,
    score,
    points = {
      win: 0,
      lose: 0
    },
    ready = false,
    opponentReady = false,
    isBombOwner = false,
    firstLoad = true;

  function disableReadyButton() {
    buttonReady.setAttribute("disabled", "disabled");
    buttonReady.style.zIndex = "1";
  }

  function enableReadyButton() {
    console.log("Enable button");
    buttonReady.removeAttribute("disabled");
    buttonReady.style.zIndex = "2";
  }

  function disableThrowButton() {
    buttonThrow.setAttribute("disabled", "disabled");
    buttonThrow.style.zIndex = "1";
    countdownMain.classList.remove("owner");
    countdownLocal.classList.remove("owner");
  }

  function enableThrowButton() {
    buttonThrow.removeAttribute("disabled");
    buttonThrow.style.zIndex = "2";
    countdownMain.classList.add("owner");
    countdownLocal.classList.add("owner");
  }

  function setMessage(text) {
    message.innerHTML = text;
  }

  function updateCountdown(time) {
    countdownMain.innerHTML = time;
  }

  function resetCountdown() {
    countdownMain.innerHTML = "";
    resetLocalCountdown();
  }

  function updateCountdownLocal(time) {
    countdownLocal.innerHTML = time;
  }

  function resetLocalCountdown() {
    countdownLocal.innerHTML = "";
  }

  function displayScore(text) {
    score.innerHTML = [
      "<h2>" + text + "</h2>",
      "<div>Won: " + points.win + "</div>",
      "<div>Lost: " + points.lose + "</div>"
    ].join("");
    countdownMain.classList.add("exploded");
  }

  function hideScore() {
    score.innerHTML = "";
    countdownMain.classList.remove("exploded");
  }

  /**
   * Bind Socket.IO and button events
   */
  function bind() {
    socket.on("start", () => {
      const pointsCount = points.win + points.lose;

      if (pointsCount === 0) {
        setMessage("Get ready!");
      }
      enableReadyButton();
    });

    socket.on("ready", bombOwner => {
      ready = true;
      if (bombOwner) {
        isBombOwner = bombOwner;
      }
      setMessage("Waiting for opponent to get ready...");
      disableReadyButton();
      hideScore();
      updateCountdown(10);
      if (ready && opponentReady) {
        setMessage("");
        if (isBombOwner) {
          enableThrowButton();
        } else {
          disableThrowButton();
        }
      }
    });

    socket.on("opponentReady", () => {
      opponentReady = true;
      hideScore();
      if (ready && opponentReady) {
        setMessage("");
        if (isBombOwner) {
          enableThrowButton();
        } else {
          disableThrowButton();
        }
      }
    });

    socket.on("update", bombOwner => {
      isBombOwner = bombOwner;
      if (isBombOwner) {
        updateCountdownLocal(3);
        enableThrowButton();
        setMessage("");
      } else {
        disableThrowButton();
        setMessage("Prepare to catch!");
      }
    });

    socket.on("win", () => {
      points.win++;
      ready = false;
      opponentReady = false;
      isBombOwner = false;
      setMessage("");
      resetCountdown();
      displayScore("You win!");
      enableReadyButton();
      disableThrowButton();
    });

    socket.on("lose", () => {
      points.lose++;
      ready = false;
      opponentReady = false;
      isBombOwner = false;
      setMessage("");
      resetCountdown();
      displayScore("You lose!");
      enableReadyButton();
      disableThrowButton();
    });

    socket.on("end", () => {
      disableThrowButton();
      disableReadyButton();
      hideScore();
      setMessage("Waiting for opponent...");
    });

    socket.on("tick", time => {
      updateCountdown(time);
    });

    socket.on("tickLocal", time => {
      if (isBombOwner) {
        updateCountdownLocal(time);
      } else {
        resetLocalCountdown();
      }
    });

    socket.on("connect", () => {
      disableThrowButton();
      disableReadyButton();
      setMessage("Waiting for opponent...");
    });

    socket.on("disconnect", () => {
      disableThrowButton();
      disableReadyButton();
      setMessage("Connection lost!");
    });

    socket.on("error", () => {
      disableThrowButton();
      disableReadyButton();
      setMessage("Connection error!");
    });

    socket.on("throw", () => {
      setMessage("Bomb in the air!");
    });

    buttonThrow.addEventListener("click", function(e) {
      socket.emit("throw");
    });

    buttonReady.addEventListener("click", function(e) {
      socket.emit("ready");
    });
  }

  /**
   * Client module init
   */
  function init() {
    socket = io({ upgrade: false, transports: ["websocket"] });
    countdownMain = document.getElementById("countdownMain");
    countdownLocal = document.getElementById("countdownLocal");
    buttonThrow = document.getElementById("buttonThrow");
    buttonReady = document.getElementById("buttonReady");
    message = document.getElementById("message");
    score = document.getElementById("score");
    //disableButton();
    bind();
  }

  window.addEventListener("load", init, false);
})();
