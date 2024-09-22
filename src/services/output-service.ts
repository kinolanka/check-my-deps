import chalk from 'chalk';

class OutputService {
  private silent: boolean;

  constructor(silent = false) {
    this.silent = silent;
  }

  public msg(message: string): void {
    if (!this.silent) {
      console.log(chalk.green(message));
    }
  }

  public error(message: string): void {
    if (!this.silent) {
      console.error(chalk.red(message));
    }
  }
}

export default OutputService;
