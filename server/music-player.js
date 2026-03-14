class MusicPlayer {
  constructor() {
    this.musicQueue = [];
    this.currentSong = null;
    this.isPlaying = false;
  }

  addSong(song) {
    this.musicQueue.push(song);
    this.broadcast('Song added: ' + song);
  }

  playSong() {
    if (this.musicQueue.length === 0) {
      this.broadcast('No songs in the queue.');
      return;
    }
    this.currentSong = this.musicQueue.shift();
    this.isPlaying = true;
    this.broadcast('Now playing: ' + this.currentSong);
    this.handleTransitions();
  }

  handleTransitions() {
    setTimeout(() => {
      this.isPlaying = false;
      this.broadcast('Finished playing: ' + this.currentSong);
      this.playSong();
    }, 3000); // Transition duration of 3 seconds
  }

  broadcast(message) {
    // Placeholder for broadcasting to connected users
    console.log(message);
  }
}

// Example usage:
const musicPlayer = new MusicPlayer();
musicPlayer.addSong('Song A');
musicPlayer.addSong('Song B');
musicPlayer.playSong();
