import { type Command } from '@event-driven-io/emmett';
import type {
  ChargeRecorded,
  GuestCheckedIn,
  GuestCheckedOut,
  GuestCheckoutFailed,
  GuestStayAccount,
  GuestStayAccountEvent,
  Opened,
  PaymentRecorded,
} from './guestStayAccount';

export type CheckIn = Command<
  'CheckIn',
  {
    guestStayAccountId: string;
    guestId: string;
    roomId: string;
  }
>;
export type RecordCharge = Command<
  'RecordCharge',
  {
    guestStayAccountId: string;
    amount: number;
  }
>;
export type RecordPayment = Command<
  'RecordPayment',
  {
    guestStayAccountId: string;
    amount: number;
  }
>;
export type CheckOut = Command<
  'CheckOut',
  {
    guestStayAccountId: string;
    groupCheckoutId?: string;
  }
>;

export type GuestStayCommand =
  | CheckIn
  | RecordCharge
  | RecordPayment
  | CheckOut;

export const checkIn = (
  { data: { guestStayAccountId, guestId, roomId }, metadata }: CheckIn,
  state: GuestStayAccount,
): GuestCheckedIn => {
  assertDoesNotExist(state);

  return {
    type: 'GuestCheckedIn',
    data: {
      guestId,
      roomId,
      guestStayAccountId,
      checkedInAt: metadata?.now ?? new Date(),
    },
  };
};

export const recordCharge = (
  { data: { guestStayAccountId, amount }, metadata }: RecordCharge,
  state: GuestStayAccount,
): ChargeRecorded => {
  assertIsOpened(state);

  return {
    type: 'ChargeRecorded',
    data: {
      guestStayAccountId,
      amount: amount,
      recordedAt: metadata?.now ?? new Date(),
    },
  };
};

export const recordPayment = (
  { data: { guestStayAccountId, amount }, metadata }: RecordPayment,
  state: GuestStayAccount,
): PaymentRecorded => {
  assertIsOpened(state);

  return {
    type: 'PaymentRecorded',
    data: {
      guestStayAccountId,
      amount: amount,
      recordedAt: metadata?.now ?? new Date(),
    },
  };
};

export const checkOut = (
  { data: { guestStayAccountId, groupCheckoutId }, metadata }: CheckOut,
  state: GuestStayAccount,
): GuestCheckedOut | GuestCheckoutFailed => {
  const now = metadata?.now ?? new Date();

  if (state.status !== 'Opened')
    return {
      type: 'GuestCheckoutFailed',
      data: {
        guestStayAccountId,
        groupCheckoutId,
        reason: 'NotOpened',
        failedAt: now,
      },
    };

  const isSettled = state.balance === 0;

  if (!isSettled)
    return {
      type: 'GuestCheckoutFailed',
      data: {
        guestStayAccountId,
        groupCheckoutId,
        reason: 'BalanceNotSettled',
        failedAt: now,
      },
    };

  return {
    type: 'GuestCheckedOut',
    data: {
      guestStayAccountId,
      groupCheckoutId,
      checkedOutAt: now,
    },
  };
};

const assertDoesNotExist = (state: GuestStayAccount): state is Opened => {
  if (state.status === 'Opened') throw Error(`Guest is already checked-in!`);

  if (state.status === 'CheckedOut')
    throw Error(`Guest account is already checked out`);

  return true;
};

const assertIsOpened = (state: GuestStayAccount): state is Opened => {
  if (state.status === 'NotExisting')
    throw Error(`Guest account doesn't exist!`);

  if (state.status === 'CheckedOut')
    throw Error(`Guest account is already checked out`);

  return true;
};

export const decide = (
  command: GuestStayCommand,
  state: GuestStayAccount,
): GuestStayAccountEvent => {
  const { type } = command;

  switch (type) {
    case 'CheckIn':
      return checkIn(command, state);
    case 'RecordCharge':
      return recordCharge(command, state);
    case 'RecordPayment':
      return recordPayment(command, state);
    case 'CheckOut':
      return checkOut(command, state);
    default: {
      const _notExistingCommandType: never = type;
      throw new Error(`Unknown command type`);
    }
  }
};
