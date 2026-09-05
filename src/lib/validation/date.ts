import { z } from "zod";

// A transaction/contribution/maturity date records when something actually
// happened, so it can never be later than today — unlike a forward-looking
// field such as an investment's maturityDate or a savings goal's targetDate,
// which are expected to be in the future and are left unrestricted.
export const zPastOrPresentDate = z.coerce.date().refine(
  (date) => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    return date.getTime() <= endOfToday.getTime();
  },
  { message: "Date cannot be in the future" }
);
