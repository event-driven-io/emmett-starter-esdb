/* eslint-disable @typescript-eslint/no-floating-promises */
import {
  DeciderSpecification,
  IllegalStateError,
} from '@event-driven-io/emmett';
import { randomUUID } from 'node:crypto';
import { describe, it } from 'node:test';
import { decide } from './businessLogic';
import {
  evolve,
  getInitialState,
  toGuestStayAccountId,
  type GuestStayAccountEvent,
} from './guestStayAccount';

const given = DeciderSpecification.for({
  decide,
  evolve,
  initialState: getInitialState,
});

describe('Guest Stay Account', () => {
  const oldTime = new Date();
  const now = new Date();

  const guestId = randomUUID();
  const roomId = randomUUID();
  const guestStayAccountId = toGuestStayAccountId(guestId, roomId, now);
  const amount = Math.random() * 100;

  describe('When not existing', () => {
    const notExistingAccount: GuestStayAccountEvent[] = [];
    it('checks in', () =>
      given(notExistingAccount)
        .when({
          type: 'CheckIn',
          data: {
            guestStayAccountId,
            guestId,
            roomId,
          },
          metadata: { now },
        })
        .then([
          {
            type: 'GuestCheckedIn',
            data: {
              guestStayAccountId,
              guestId,
              roomId,
              checkedInAt: now,
            },
          },
        ]));

    it(`doesn't record charge`, () =>
      given(notExistingAccount)
        .when({
          type: 'RecordCharge',
          data: {
            guestStayAccountId,
            amount,
          },
          metadata: { now },
        })
        .thenThrows<IllegalStateError>(
          (error) => error.message === `Guest account doesn't exist!`,
        ));

    it(`doesn't record payment`, () =>
      given(notExistingAccount)
        .when({
          type: 'RecordPayment',
          data: {
            guestStayAccountId,
            amount,
          },
          metadata: { now },
        })
        .thenThrows<IllegalStateError>(
          (error) => error.message === `Guest account doesn't exist!`,
        ));

    it(`doesn't checkout`, () =>
      given(notExistingAccount)
        .when({
          type: 'CheckOut',
          data: {
            guestStayAccountId,
          },
          metadata: { now },
        })
        .then([
          {
            type: 'GuestCheckoutFailed',
            data: {
              guestStayAccountId,
              groupCheckoutId: undefined,
              reason: 'NotOpened',
              failedAt: now,
            },
          },
        ]));
  });

  describe('When checked in', () => {
    const checkedInAccount: GuestStayAccountEvent[] = [
      {
        type: 'GuestCheckedIn',
        data: {
          guestStayAccountId,
          guestId,
          roomId,
          checkedInAt: oldTime,
        },
      },
    ];

    it(`doesn't check in`, () =>
      given(checkedInAccount)
        .when({
          type: 'CheckIn',
          data: {
            guestStayAccountId,
            guestId,
            roomId,
          },
          metadata: { now },
        })
        .thenThrows<IllegalStateError>(
          (error) => error.message === `Guest is already checked-in!`,
        ));

    it('records charge', () => {
      given(checkedInAccount)
        .when({
          type: 'RecordCharge',
          data: {
            guestStayAccountId,
            amount,
          },
          metadata: { now },
        })
        .then([
          {
            type: 'ChargeRecorded',
            data: {
              guestStayAccountId,
              amount,
              recordedAt: now,
            },
          },
        ]);
    });

    it('records payment', () =>
      given(checkedInAccount)
        .when({
          type: 'RecordPayment',
          data: {
            guestStayAccountId,
            amount,
          },
          metadata: { now },
        })
        .then([
          {
            type: 'PaymentRecorded',
            data: {
              guestStayAccountId,
              amount,
              recordedAt: now,
            },
          },
        ]));

    it('checks out', () =>
      given(checkedInAccount)
        .when({
          type: 'CheckOut',
          data: {
            guestStayAccountId,
          },
          metadata: { now },
        })
        .then([
          {
            type: 'GuestCheckedOut',
            data: {
              guestStayAccountId,
              checkedOutAt: now,
              groupCheckoutId: undefined,
            },
          },
        ]));

    describe('with unsettled balance', () => {
      const unsettledAccount: GuestStayAccountEvent[] = [
        {
          type: 'GuestCheckedIn',
          data: {
            guestStayAccountId,
            guestId,
            roomId,
            checkedInAt: oldTime,
          },
        },
        {
          type: 'ChargeRecorded',
          data: {
            amount,
            guestStayAccountId,
            recordedAt: oldTime,
          },
        },
      ];

      it('records charge', () => {
        given(unsettledAccount)
          .when({
            type: 'RecordCharge',
            data: {
              guestStayAccountId,
              amount,
            },
            metadata: { now },
          })
          .then([
            {
              type: 'ChargeRecorded',
              data: {
                guestStayAccountId,
                amount,
                recordedAt: now,
              },
            },
          ]);
      });

      it('records payment', () =>
        given(unsettledAccount)
          .when({
            type: 'RecordPayment',
            data: {
              guestStayAccountId,
              amount,
            },
            metadata: { now },
          })
          .then([
            {
              type: 'PaymentRecorded',
              data: {
                guestStayAccountId,
                amount,
                recordedAt: now,
              },
            },
          ]));

      it(`doesn't check out`, () =>
        given(unsettledAccount)
          .when({
            type: 'CheckOut',
            data: {
              guestStayAccountId,
            },
            metadata: { now },
          })
          .then([
            {
              type: 'GuestCheckoutFailed',
              data: {
                guestStayAccountId,
                reason: 'BalanceNotSettled',
                groupCheckoutId: undefined,
                failedAt: now,
              },
            },
          ]));
    });

    describe('with settled balance', () => {
      const settledAccount: GuestStayAccountEvent[] = [
        {
          type: 'GuestCheckedIn',
          data: {
            guestStayAccountId,
            guestId,
            roomId,
            checkedInAt: oldTime,
          },
        },
        {
          type: 'ChargeRecorded',
          data: {
            amount,
            guestStayAccountId,
            recordedAt: oldTime,
          },
        },
        {
          type: 'PaymentRecorded',
          data: {
            amount,
            guestStayAccountId,
            recordedAt: oldTime,
          },
        },
      ];

      it('records charge', () => {
        given(settledAccount)
          .when({
            type: 'RecordCharge',
            data: {
              guestStayAccountId,
              amount,
            },
            metadata: { now },
          })
          .then([
            {
              type: 'ChargeRecorded',
              data: {
                guestStayAccountId,
                amount,
                recordedAt: now,
              },
            },
          ]);
      });

      it('records payment', () =>
        given(settledAccount)
          .when({
            type: 'RecordPayment',
            data: {
              guestStayAccountId,
              amount,
            },
            metadata: { now },
          })
          .then([
            {
              type: 'PaymentRecorded',
              data: {
                guestStayAccountId,
                amount,
                recordedAt: now,
              },
            },
          ]));

      it(`checks out`, () =>
        given(settledAccount)
          .when({
            type: 'CheckOut',
            data: {
              guestStayAccountId,
            },
            metadata: { now },
          })
          .then([
            {
              type: 'GuestCheckedOut',
              data: {
                guestStayAccountId,
                groupCheckoutId: undefined,
                checkedOutAt: now,
              },
            },
          ]));
    });
  });

  describe('When checked out', () => {
    const checkedOutAccount: GuestStayAccountEvent[] = [
      {
        type: 'GuestCheckedIn',
        data: {
          guestStayAccountId,
          guestId,
          roomId,
          checkedInAt: oldTime,
        },
      },
      {
        type: 'ChargeRecorded',
        data: {
          amount,
          guestStayAccountId,
          recordedAt: oldTime,
        },
      },
      {
        type: 'PaymentRecorded',
        data: {
          amount,
          guestStayAccountId,
          recordedAt: oldTime,
        },
      },
      {
        type: 'GuestCheckedOut',
        data: {
          guestStayAccountId,
          groupCheckoutId: undefined,
          checkedOutAt: now,
        },
      },
    ];

    it(`doesn't check in`, () =>
      given(checkedOutAccount)
        .when({
          type: 'CheckIn',
          data: {
            guestStayAccountId,
            guestId,
            roomId,
          },
          metadata: { now },
        })
        .thenThrows<IllegalStateError>(
          (error) => error.message === `Guest account is already checked out`,
        ));

    it(`doesn't record charge`, () =>
      given(checkedOutAccount)
        .when({
          type: 'RecordCharge',
          data: {
            guestStayAccountId,
            amount,
          },
          metadata: { now },
        })
        .thenThrows<IllegalStateError>(
          (error) => error.message === `Guest account is already checked out`,
        ));

    it(`doesn't record payment`, () =>
      given(checkedOutAccount)
        .when({
          type: 'RecordPayment',
          data: {
            guestStayAccountId,
            amount,
          },
          metadata: { now },
        })
        .thenThrows<IllegalStateError>(
          (error) => error.message === `Guest account is already checked out`,
        ));

    it(`doesn't checkout`, () =>
      given(checkedOutAccount)
        .when({
          type: 'CheckOut',
          data: {
            guestStayAccountId,
          },
          metadata: { now },
        })
        .then([
          {
            type: 'GuestCheckoutFailed',
            data: {
              guestStayAccountId,
              groupCheckoutId: undefined,
              reason: 'NotOpened',
              failedAt: now,
            },
          },
        ]));
  });
});
