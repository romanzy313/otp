/* eslint-disable no-undef */
export class OtpCountdown extends HTMLElement {
  interval;

  /**
   * @param {number} seconds
   */
  formatDelta(seconds) {
    if (seconds <= 0) return '';

    return `${seconds} seconds`;
  }

  constructor() {
    super();

    const expiresAt = parseInt(this.getAttribute('data-expiry') || '-1');
    const eventName = 'expired'; //this.getAttribute("data-event-name") || "expired";
    if (expiresAt == -1) throw new Error('no expiry or event name defined');

    this.interval = setInterval(() => {
      const delta = expiresAt - Date.now();
      const seconds = Math.floor(delta / 1000);
      this.innerHTML = this.formatDelta(seconds);

      if (seconds <= 0) {
        clearInterval(this.interval);
        // fire the event
        console.log('timer expired', eventName);
        // @ts-ignore
        htmx.trigger(this, 'expired');
      }
    }, 1000);

    this.innerHTML = this.formatDelta(
      Math.floor((expiresAt - Date.now()) / 1000)
    );
  }
}

if (!customElements.get('otp-countdown'))
  customElements.define('otp-countdown', OtpCountdown);
