import chalk from 'chalk';

class OutputService {
  private silent: boolean;

  constructor(silent = false) {
    this.silent = silent;
  }

  private _log(message: string): void {
    if (!this.silent) {
      console.log(message);
    }
  }

  public msg(message: string): void {
    this._log(chalk.blue(message));
  }

  public successMsg(message: string): void {
    this._log(chalk.green(message));
  }

  public errorMsg(message: string): void {
    this._log(chalk.red(message));
  }

  public error(error: Error): void {
    console.log(error);
  }
}

export default OutputService;
