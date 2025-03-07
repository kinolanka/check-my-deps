import chalk from 'chalk';

class OutputService {
  private silent: boolean;
  private loadingInterval: NodeJS.Timeout | null = null;
  private loadingChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private loadingIndex = 0;
  private currentLoadingText = '';
  private startTime: number = 0;

  constructor(silent = false) {
    this.silent = silent;
  }

  private _log(message: string): void {
    if (!this.silent) {
      console.log(message);
    }
  }

  public msg(message: string): void {
    // If loading is active, stop it temporarily to show the message
    const isLoading = this.loadingInterval !== null;
    if (isLoading) {
      this.clearLine();
    }

    this._log(chalk.blue(message));

    // Resume loading if it was active
    if (isLoading) {
      this.renderLoading();
    }
  }

  public successMsg(message: string): void {
    // If loading is active, stop it temporarily to show the message
    const isLoading = this.loadingInterval !== null;
    if (isLoading) {
      this.clearLine();
    }

    this._log(chalk.green(message));

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

    this._log(chalk.red(message));

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

    console.log(error);
  }

  public log(message: string): void {
    // If loading is active, stop it temporarily to show the message
    const isLoading = this.loadingInterval !== null;
    if (isLoading) {
      this.clearLine();
    }

    this._log(chalk.yellow(`ℹ ${message}`));

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
    process.stdout.write(
      `${chalk.blue(spinner)} ${this.currentLoadingText} ${chalk.dim(`[${elapsedTime}s]`)}`
    );
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
      this._log(
        chalk.green(
          `✓ ${this.currentLoadingText} ${chalk.dim(`[${((Date.now() - this.startTime) / 1000).toFixed(1)}s]`)}`
        )
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
        this._log(finalMessage);
      }
    }
  }

  public stopLoadingSuccess(message: string): void {
    this.stopLoading(chalk.green(`✓ ${message}`));
  }

  public stopLoadingError(message: string): void {
    this.stopLoading(chalk.red(`✗ ${message}`));
  }
}

export default OutputService;
