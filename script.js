'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const inputFields = document.querySelectorAll('.form__input');
const mapArea = document.querySelector('#map');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  click = 0;
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  _clicks() {
    this.click++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // mins/km
    this.pace = Math.trunc(this.duration / this.distance);
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this._setDescription();
    this.calcSpeed();
  }
  calcSpeed() {
    //km/h
    this.speed = Math.trunc(this.distance / (this.duration / 60));
    return this.speed;
  }
}

///////////////////////////////////////////////////////////////
// Application Architrcture
class App {
  #map;
  #mobj;
  #workout = [];
  constructor() {
    //Get user position
    this._getPosition();

    //Get local storrage data
    this._getLocalStorage();
    this.#workout.forEach(el => {
      this._renderWorkout(el);
    });

    //Event listeners
    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggleElevationField.bind(this));

    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));
    this.#workout.forEach(el => this._renderWorkoutMarker(el));
  }

  _showForm(mapObj) {
    this.#mobj = mapObj;
    inputDistance.focus();
    form.classList.remove('hidden');
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation
      .closest('.form__row')
      .classmapList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const { lat, lng } = this.#mobj.latlng;
    const validInputs = (...input) => input.every(inp => Number.isFinite(inp));
    const allPositive = (...input) => input.every(inp => inp >= 1);
    e.preventDefault();
    let activity = '';
    //Get data from input fields
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let workout;
    //Running? Create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert('Not Valid INputs');
      }

      activity = '🏃‍♂️ Running';
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //Cycling? Create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Not Valid INputs');

      activity = '🚴‍♂️ Cycling';
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //Add new object to workout array
    this.#workout.push(workout);

    //Render workout on map as marker
    this._renderWorkoutMarker(workout);

    inputDistance.focus();

    //Render workout on list
    this._renderWorkout(workout);

    // Hide form and clear input fields
    form.classList.add('hidden');
    inputDistance.value = inputCadence.value = inputDuration.value = '';

    //Set local Storage
    this._setLocalStorage();
  }
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup(
          {
            maxWidth: 250,
            minWidth: 100,
            className: `${workout.type}-popup`,
            autoClose: false,
            closeOnClick: false,
          },
          'Workout'
        )
      )
      .setPopupContent(`${workout.description}`)
      .openPopup();
  }
  _renderWorkout(workout) {
    const workoutDetails = `<li class="workout workout--${
      workout.type
    }" data-id="${workout.id}">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'cycling' ? '🚴‍♂️' : '🏃‍♂️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${
        workout.type === 'cycling' ? workout.speed : workout.pace
      }</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'cycling' ? '⛰' : '🦶🏼'
      }</span>
      <span class="workout__value">${
        workout.type === 'cycling' ? workout.elevationGain : workout.cadence
      }</span>
      <span class="workout__unit">${
        workout.type === 'cycling' ? 'M' : 'SPM'
      }</span>
    </div>
    </li>`;
    containerWorkouts.insertAdjacentHTML('beforeend', workoutDetails);
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const work = this.#workout.find(
      workout => workout.id === workoutEl.dataset.id
    );
    const [lat, lng] = work.coords;
    this.#map.setView([lat, lng], 13);
  }
  _setLocalStorage() {
    localStorage.setItem('workout', JSON.stringify(this.#workout));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workout'));
    if (!data) return;
    this.#workout = data;
  }
  _reset() {
    localStorage.removeItem('workout');
    location.reload();
  }
}

const app = new App();
// function connectTheDots(data) {
//   const ls = JSON.parse(localStorage.getItem('workout'));
//   var c = [];
//   ls.forEach(el => {
//     // console.log(el.coords);
//     var x = el.coords[0];
//     var y = el.coords[1];
//     c.push([x, y]);
//   });
//   return c;
// }
// const pathCoords = connectTheDots();
// L.polyline(pathCoords).addTo(map);
// console.log('THIS', pathCoords);
