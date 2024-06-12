import {
  formatDateToUtcYYYYMMDD,
  getInMemoryEventStore,
  type EventStore,
} from '@event-driven-io/emmett';
import {
  ApiSpecification,
  expectError,
  expectNewEvents,
  expectResponse,
  getApplication,
} from '@event-driven-io/emmett-expressjs';
import type { TestEventStream } from '@event-driven-io/emmett-expressjs/dist/testing/utils';
import { randomUUID } from 'node:crypto';
import { beforeEach, describe, it } from 'node:test';
import { guestStayAccountsApi } from './api';
import {
  toGuestStayAccountId,
  type GuestStayAccountEvent,
} from './guestStayAccount';

const doesGuestStayExist = (_guestId: string, _roomId: string, _day: Date) =>
  Promise.resolve(true);

void describe('Guest stay account', () => {
  //const oldTime = new Date();
  const now = new Date();
  const formattedNow = formatDateToUtcYYYYMMDD(now);

  let guestId: string;
  let roomId: string;
  let guestStayAccountId: string;
  const amount = Math.random() * 100;

  beforeEach(() => {
    guestId = randomUUID();
    roomId = randomUUID();
    guestStayAccountId = toGuestStayAccountId(guestId, roomId, now);
  });

  void describe('When not existing', () => {
    const notExistingAccount: TestEventStream<GuestStayAccountEvent>[] = [];

    void it('checks in', () =>
      given(...notExistingAccount)
        .when((request) => request.post(`/guests/${guestId}/stays/${roomId}`))
        .then([
          expectResponse(201),
          expectNewEvents(guestStayAccountId, [
            {
              type: 'GuestCheckedIn',
              data: {
                guestStayAccountId,
                guestId,
                roomId,
                checkedInAt: now,
              },
            },
          ]),
        ]));

    void it(`doesn't record charge`, () =>
      given(...notExistingAccount)
        .when((request) =>
          request
            .post(
              `/guests/${guestId}/stays/${roomId}/periods/${formattedNow}/charges`,
            )
            .send({ amount }),
        )
        .then(
          expectError(403, {
            detail: `Guest account doesn't exist!`,
          }),
        ));

    void it(`doesn't record payment`, () =>
      given(...notExistingAccount)
        .when((request) =>
          request
            .post(
              `/guests/${guestId}/stays/${roomId}/periods/${formattedNow}/payments`,
            )
            .send({ amount }),
        )
        .then(
          expectError(403, {
            detail: `Guest account doesn't exist!`,
          }),
        ));

    void it(`doesn't checkout`, () =>
      given(...notExistingAccount)
        .when((request) =>
          request.delete(
            `/guests/${guestId}/stays/${roomId}/periods/${formattedNow}`,
          ),
        )
        .then(expectError(403)));
  });

  // void describe('When opened with product item', () => {
  //   void it('should confirm', () => {
  //     return given(
  //       existingStream(guestStayAccountId, [
  //         {
  //           type: 'ProductItemAddedToShoppingCart',
  //           data: {
  //             guestStayAccountId,
  //             productItem,
  //             addedAt: oldTime,
  //           },
  //         },
  //       ]),
  //     )
  //       .when((request) =>
  //         request.post(`/clients/${clientId}/shopping-carts/current/confirm`),
  //       )
  //       .then([
  //         expectResponse(204),
  //         expectNewEvents(guestStayAccountId, [
  //           {
  //             type: 'ShoppingCartConfirmed',
  //             data: {
  //               guestStayAccountId,
  //               confirmedAt: now,
  //             },
  //           },
  //         ]),
  //       ]);
  //   });
  // });

  // void describe('When confirmed', () => {
  //   void it('should not add products', () => {
  //     return given(
  //       existingStream(guestStayAccountId, [
  //         {
  //           type: 'ProductItemAddedToShoppingCart',
  //           data: {
  //             guestStayAccountId,
  //             productItem,
  //             addedAt: oldTime,
  //           },
  //         },
  //         {
  //           type: 'ShoppingCartConfirmed',
  //           data: { guestStayAccountId, confirmedAt: oldTime },
  //         },
  //       ]),
  //     )
  //       .when((request) =>
  //         request
  //           .post(`/clients/${clientId}/shopping-carts/current/product-items`)
  //           .send(productItem),
  //       )
  //       .then(
  //         expectError(403, {
  //           detail: 'Shopping Cart already closed',
  //           status: 403,
  //           title: 'Forbidden',
  //           type: 'about:blank',
  //         }),
  //       );
  //   });
  // });

  const given = ApiSpecification.for<GuestStayAccountEvent>(
    (): EventStore => getInMemoryEventStore(),
    (eventStore: EventStore) =>
      getApplication({
        apis: [guestStayAccountsApi(eventStore, doesGuestStayExist, () => now)],
      }),
  );
});
