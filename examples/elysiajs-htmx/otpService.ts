import { OtpService } from '@romanzy/otp';
import { MemoryStorage } from '@romanzy/otp/storage/MemoryStorage';

export const otpService = new OtpService({
  storage: new MemoryStorage(),
  maxAttempts: 2,
  timeToResend: 10 * 1000,
  timeToSolve: 60 * 1000,
  gracePeriod: 5 * 1000,
  generateSolution: () => '1234',
  sendOtp: async (account, solution, args: { locale: string }) => {
    console.log(
      'sent otp to',
      account,
      'with solution',
      solution,
      'and locale',
      args.locale
    );
  },
});
