"use strict";

const users = [];

function findOpponent(user) {
  for (let i = 0; i < users.length; i++) {
    if (user !== users[i] && users[i].opponent === null) {
      new Game(user, users[i]).start();
    }
  }
}

function removeUser(user) {
  users.splice(users.indexOf(user), 1);
}

class Game {
  constructor(user1, user2) {
    this.user1 = user1;
    this.user2 = user2;
    this.bombOwner = null;
    this.roundTime = 10;
    this.throwTime = 3;
    this.playing = false;
  }

  start() {
    console.log("Starting");
    this.user1.start(this, this.user2);
    this.user2.start(this, this.user1);
  }

  ready(id) {
    // first thrower is first to join
    if (!this.bombOwner) {
      this.bombOwner = id;
    }
    if (this.user1.id === id) {
      this.user1.ready(this.user2, this.bombOwner === this.user1.id);
    }
    if (this.user2.id === id) {
      this.user2.ready(this.user1, this.bombOwner === this.user2.id);
    }

    if (this.user1.isReady && this.user2.isReady) {
      this.startMainCountdown();
      this.startLocalCountdown();
    }
  }

  ended() {
    return this.user1.dead || this.user2.dead;
  }

  setBombOwner() {
    clearInterval(this.countdownLocal);
    if (this.bombOwner === this.user1.id) {
      this.bombOwner = this.user2.id;
      this.user1.tick("");
    } else {
      this.bombOwner = this.user1.id;
      this.user2.tick("");
    }
    this.user1.update(this.bombOwner === this.user1.id);
    this.user2.update(this.bombOwner === this.user2.id);
    this.throwTime = 3;
    this.startLocalCountdown();
  }

  startMainCountdown() {
    this.playing = true;
    this.countdown = setInterval(() => {
      this.user1.tick(this.roundTime);
      this.user2.tick(this.roundTime);
      this.roundTime--;
      if (this.roundTime < 0) {
        if (this.playing) {
          clearInterval(this.countdownLocal);
          clearInterval(this.countdown);
          this.roundOver();
          this.start();
          storage.get("games", 0).then(games => {
            storage.set("games", games + 1);
          });
          this.playing = false;
        }
      }
    }, 1000);
  }

  startLocalCountdown() {
    this.countdownLocal = setInterval(() => {
      this.user1.tickLocal(this.throwTime);
      this.user2.tickLocal(this.throwTime);

      this.throwTime--;
      if (this.throwTime < 0) {
        if (this.playing) {
          clearInterval(this.countdownLocal);
          clearInterval(this.countdown);
          this.roundOver();
          this.start();
          storage.get("games", 0).then(games => {
            storage.set("games", games + 1);
          });
          this.playing = false;
        }
      }
    }, 1000);
  }

  roundOver() {
    if (this.bombOwner === this.user2.id) {
      this.user1.win();
      this.user2.lose();
    } else {
      this.user1.lose();
      this.user2.win();
    }
    this.bombOwner = null;
    this.roundTime = 10;
    this.throwTime = 3;
  }
}

class User {
  constructor(socket) {
    this.socket = socket;
    this.game = null;
    this.opponent = null;
    this.isReady = false;
  }

  start(game, opponent) {
    this.game = game;
    this.opponent = opponent;
    this.socket.emit("start");
  }

  ready(opponent, bombOwner) {
    this.isReady = true;
    this.socket.emit("ready", bombOwner);
    opponent.socket.emit("opponentReady");
  }

  update(bombOwner) {
    this.socket.emit("update", bombOwner);
  }

  end() {
    this.game = null;
    this.opponent = null;
    this.hasBomb = null;
    this.socket.emit("end");
  }

  tick(time) {
    this.socket.emit("tick", time);
  }

  tickLocal(time) {
    this.socket.emit("tickLocal", time);
  }

  win() {
    this.isReady = false;
    this.socket.emit("win");
  }

  lose() {
    this.isReady = false;
    this.socket.emit("lose");
  }
}

module.exports = {
  io: socket => {
    const user = new User(socket);
    user.id = socket.id;

    users.push(user);
    findOpponent(user);

    socket.on("disconnect", () => {
      console.log("Disconnected: " + socket.id);
      removeUser(user);
      if (user.opponent) {
        user.opponent.end();
        findOpponent(user.opponent);
      }
    });

    socket.on("throw", () => {
      user.game.setBombOwner();
    });

    socket.on("ready", () => {
      user.game.ready(user.id);
    });

    console.log("Connected: " + socket.id);
  },

  stat: (req, res) => {
    storage.get("games", 0).then(games => {
      res.send(`<h1>Games played: ${games}</h1>`);
    });
  }
};
