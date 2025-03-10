/**
 * @fileoverview Provides the OutputService class for handling CLI output and loading indicators.
 *
 * This module implements a service for managing terminal output with features including:
 * - Animated loading spinners with elapsed time tracking
 * - Silent mode support for suppressing output
 * - Different message types (standard, success, error)
 * - Loading state management with step-by-step progress updates
 *
 * The service provides a consistent interface for displaying feedback to users
 * during potentially long-running operations, enhancing the CLI user experience.
 */

class OutputService {
  private silent: boolean;
  private loadingInterval: ReturnType<typeof setTimeout> | null = null;
  private loadingChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private loadingIndex = 0;
  private currentLoadingText = '';
  private startTime: number = 0;

  constructor(silent = false) {
    this.silent = silent;
  }

  private logToConsole(message: string, force = false): void {
    if (force || !this.silent) {
      // eslint-disable-next-line no-console
      console.log(message);
    }
  }

  public msg(message: string, force = false): void {
    // If loading is active, stop it temporarily to show the message
    const isLoading = this.loadingInterval !== null;

    if (isLoading && (force || !this.silent)) {
      this.clearLine();
    }

    this.logToConsole(message, force);

    // Resume loading if it was active
    if (isLoading && (force || !this.silent)) {
      this.renderLoading();
    }
  }

  public successMsg(message: string): void {
    // If loading is active, stop it temporarily to show the message
    const isLoading = this.loadingInterval !== null;

    if (isLoading) {
      this.clearLine();
    }

    this.logToConsole(message);

    // Resume loading if it was active
    if (isLoading) {
      this.renderLoading();
    }
  }

  public errorMsg(message: string): void {
    // If loading is active, stop it temporarily to show the message
    const isLoading = this.loadingInterval !== null;

    if (isLoading) {
      this.clearLine();
    }

    this.logToConsole(message);

    // Resume loading if it was active
    if (isLoading) {
      this.renderLoading();
    }
  }

  public error(error: Error): void {
    // If loading is active, stop it
    if (this.loadingInterval !== null) {
      this.stopLoading();
    }

    console.error(error);
  }

  public log(message: string): void {
    // If loading is active, stop it temporarily to show the message
    const isLoading = this.loadingInterval !== null;

    if (isLoading) {
      this.clearLine();
    }

    this.logToConsole(`ℹ ${message}`);

    // Resume loading if it was active
    if (isLoading) {
      this.renderLoading();
    }
  }

  private clearLine(): void {
    process.stdout.write('\r\u001B[K');
  }

  private renderLoading(): void {
    const spinner = this.loadingChars[this.loadingIndex];

    const elapsedTime = ((Date.now() - this.startTime) / 1000).toFixed(1);

    // Clear current line and write the spinner, text, and elapsed time
    this.clearLine();

    process.stdout.write(`${spinner} ${this.currentLoadingText} ${`[${elapsedTime}s]`}`);
  }

  public startLoading(text: string): void {
    if (this.silent) return;

    this.stopLoading();

    this.currentLoadingText = text;

    this.startTime = Date.now();

    // Hide cursor
    process.stdout.write('\u001B[?25l');

    // Initial render
    this.renderLoading();

    this.loadingInterval = setInterval(() => {
      this.loadingIndex = (this.loadingIndex + 1) % this.loadingChars.length;

      this.renderLoading();
    }, 80);
  }

  public updateLoadingText(text: string): void {
    if (this.silent || !this.loadingInterval) return;

    // Log the previous step as completed
    if (this.currentLoadingText) {
      this.clearLine();

      this.logToConsole(
        `✓ ${this.currentLoadingText} ${`[${((Date.now() - this.startTime) / 1000).toFixed(1)}s]`}`
      );
    }

    // Update the text for the next step
    this.currentLoadingText = text;

    this.startTime = Date.now(); // Reset timer for the new step

    // Render the new loading state
    this.renderLoading();
  }

  public stopLoading(finalMessage?: string): void {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);

      this.loadingInterval = null;

      // Clear current line
      this.clearLine();

      // Show cursor again
      process.stdout.write('\u001B[?25h');

      if (finalMessage) {
        this.logToConsole(finalMessage);
      }
    }
  }

  public stopLoadingSuccess(message: string): void {
    this.stopLoading(`✓ ${message}`);
  }

  public stopLoadingError(message: string): void {
    this.stopLoading(`✗ ${message}`);
  }
}

export default OutputService;
