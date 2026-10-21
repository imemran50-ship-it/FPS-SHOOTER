export interface InputState {
  moveForward: number; // -1 to 1
  moveRight: number; // -1 to 1
  lookDeltaX: number;
  lookDeltaY: number;
  isFiring: boolean;
  isADS: boolean;
  isSprinting: boolean;
  isCrouching: boolean;
  justJumped: boolean;
  justReloaded: boolean;
  switchWeaponIndex: number | null;
  justPaused: boolean;
}

export class InputManager {
  private keysHeld = new Set<string>();
  private justPressed = new Set<string>();

  public moveForward = 0;
  public moveRight = 0;
  public lookDeltaX = 0;
  public lookDeltaY = 0;
  public isFiring = false;
  public isADS = false;
  public isSprinting = false;
  public isCrouching = false;
  public justJumped = false;
  public justReloaded = false;
  public switchWeaponIndex: number | null = null;
  public justPaused = false;

  // Joystick touch tracking
  private joystickTouchId: number | null = null;
  private joystickOrigin = { x: 0, y: 0 };
  public joystickCurrent = { x: 0, y: 0 };
  public isJoystickActive = false;

  // Look touch tracking
  private lookTouchId: number | null = null;
  private lastLookPos = { x: 0, y: 0 };

  // Settings
  public touchSensitivity = 0.0035;
  public mouseSensitivity = 0.0022;

  private isPointerLocked = false;
  private canvasElement: HTMLElement | null = null;

  constructor() {
    this.bindKeyboard();
    this.bindWindowEvents();
  }

  public attachCanvas(canvas: HTMLElement) {
    this.canvasElement = canvas;
    this.bindPointerLock(canvas);
  }

  private bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      const code = e.code;
      if (!this.keysHeld.has(code)) {
        this.justPressed.add(code);
      }
      this.keysHeld.add(code);

      if (code === 'KeyP' || code === 'Escape') {
        this.justPaused = true;
      }
      if (code === 'Space') {
        this.justJumped = true;
      }
      if (code === 'KeyR') {
        this.justReloaded = true;
      }
      if (code === 'KeyC') {
        this.isCrouching = !this.isCrouching;
      }
      if (code === 'Digit1') this.switchWeaponIndex = 0;
      if (code === 'Digit2') this.switchWeaponIndex = 1;
      if (code === 'Digit3') this.switchWeaponIndex = 2;
      if (code === 'Digit4') this.switchWeaponIndex = 3;
    });

    window.addEventListener('keyup', (e) => {
      this.keysHeld.delete(e.code);
    });
  }

  private bindPointerLock(canvas: HTMLElement) {
    canvas.addEventListener('click', () => {
      if (document.body.dataset.state === 'playing' && !document.pointerLockElement) {
        canvas.requestPointerLock?.();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.lookDeltaX += e.movementX * this.mouseSensitivity;
        this.lookDeltaY += e.movementY * this.mouseSensitivity;
      }
    });

    window.addEventListener('mousedown', (e) => {
      if (this.isPointerLocked) {
        if (e.button === 0) {
          this.isFiring = true;
        } else if (e.button === 2) {
          e.preventDefault();
          this.isADS = !this.isADS;
        }
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isFiring = false;
      }
    });

    window.addEventListener('contextmenu', (e) => {
      if (this.isPointerLocked) {
        e.preventDefault();
      }
    });
  }

  private bindWindowEvents() {
    const clearInputs = () => {
      this.keysHeld.clear();
      this.justPressed.clear();
      this.isFiring = false;
      this.lookDeltaX = 0;
      this.lookDeltaY = 0;
      this.joystickTouchId = null;
      this.lookTouchId = null;
      this.isJoystickActive = false;
    };

    window.addEventListener('blur', clearInputs);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearInputs();
    });
  }

  // --- Mobile Touch Events ---
  public handleTouchStart(e: React.TouchEvent) {
    const screenWidth = window.innerWidth;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.clientX < screenWidth * 0.45 && this.joystickTouchId === null) {
        // Left zone: Joystick
        this.joystickTouchId = t.identifier;
        this.joystickOrigin = { x: t.clientX, y: t.clientY };
        this.joystickCurrent = { x: t.clientX, y: t.clientY };
        this.isJoystickActive = true;
      } else if (t.clientX >= screenWidth * 0.45 && this.lookTouchId === null) {
        // Right zone: Look pad
        this.lookTouchId = t.identifier;
        this.lastLookPos = { x: t.clientX, y: t.clientY };
      }
    }
  }

  public handleTouchMove(e: React.TouchEvent) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === this.joystickTouchId) {
        this.joystickCurrent = { x: t.clientX, y: t.clientY };
        const dx = t.clientX - this.joystickOrigin.x;
        const dy = t.clientY - this.joystickOrigin.y;
        const maxDist = 55;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clampedDist = Math.min(dist, maxDist);
        const angle = Math.atan2(dy, dx);

        this.moveRight = (Math.cos(angle) * clampedDist) / maxDist;
        this.moveForward = -(Math.sin(angle) * clampedDist) / maxDist;

        // Upward sprint flick
        this.isSprinting = dy < -45;
      } else if (t.identifier === this.lookTouchId) {
        const dx = t.clientX - this.lastLookPos.x;
        const dy = t.clientY - this.lastLookPos.y;
        this.lastLookPos = { x: t.clientX, y: t.clientY };

        this.lookDeltaX += dx * this.touchSensitivity;
        this.lookDeltaY += dy * this.touchSensitivity;
      }
    }
  }

  public handleTouchEnd(e: React.TouchEvent) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === this.joystickTouchId) {
        this.joystickTouchId = null;
        this.isJoystickActive = false;
        this.moveForward = 0;
        this.moveRight = 0;
        this.isSprinting = false;
      } else if (t.identifier === this.lookTouchId) {
        this.lookTouchId = null;
      }
    }
  }

  public update(): InputState {
    // Keyboard movement check
    let kbForward = 0;
    let kbRight = 0;
    if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) kbForward += 1;
    if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) kbForward -= 1;
    if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) kbRight += 1;
    if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) kbRight -= 1;

    const finalForward = this.isJoystickActive ? this.moveForward : kbForward;
    const finalRight = this.isJoystickActive ? this.moveRight : kbRight;
    const isSprint = this.keysHeld.has('ShiftLeft') || this.keysHeld.has('ShiftRight') || this.isSprinting;

    const state: InputState = {
      moveForward: finalForward,
      moveRight: finalRight,
      lookDeltaX: this.lookDeltaX,
      lookDeltaY: this.lookDeltaY,
      isFiring: this.isFiring || this.keysHeld.has('SpaceFire'),
      isADS: this.isADS,
      isSprinting: isSprint,
      isCrouching: this.isCrouching,
      justJumped: this.justJumped,
      justReloaded: this.justReloaded,
      switchWeaponIndex: this.switchWeaponIndex,
      justPaused: this.justPaused
    };

    // Reset per-frame edge triggers
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    this.justJumped = false;
    this.justReloaded = false;
    this.switchWeaponIndex = null;
    this.justPaused = false;
    this.justPressed.clear();

    return state;
  }
}
