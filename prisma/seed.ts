import {
  BookingStatus,
  BookingType,
  DocumentType,
  ExpenseCategory,
  InviteStatus,
  ParticipantRole,
  PrismaClient,
  SplitMode,
  TripStatus,
  VerificationStatus,
} from "../src/generated/prisma";

// Privileged by design: this file is maintenance-only and is never imported
// by src/, so request handlers cannot reach a BYPASSRLS client.
const privilegedPrisma = new PrismaClient();

const ids = {
  owner: "10000000-0000-4000-8000-000000000001",
  leo: "20000000-0000-4000-8000-000000000001",
  amara: "20000000-0000-4000-8000-000000000002",
  tokyo: "30000000-0000-4000-8000-000000000001",
  amaraPassport: "40000000-0000-4000-8000-000000000001",
  bookings: {
    outbound: "50000000-0000-4000-8000-000000000001",
    transfer: "50000000-0000-4000-8000-000000000002",
    lodging1: "50000000-0000-4000-8000-000000000003",
    walk1: "50000000-0000-4000-8000-000000000004",
    walk2: "50000000-0000-4000-8000-000000000005",
    museum: "50000000-0000-4000-8000-000000000006",
    dinner: "50000000-0000-4000-8000-000000000007",
    night1: "50000000-0000-4000-8000-000000000008",
    night2: "50000000-0000-4000-8000-000000000009",
    lodging2: "50000000-0000-4000-8000-000000000010",
    return: "50000000-0000-4000-8000-000000000011",
    unscheduled: "50000000-0000-4000-8000-000000000012",
  },
} as const;

const flightDetails = {
  type: "flight",
  bookingReference: "XJ7K9P",
  segments: [
    {
      airlineName: "Finnair",
      carrierCode: "AY",
      flightNumber: "1234",
      aircraftType: "Airbus A320",
      cabinClass: "Economy",
      fareType: "Value",
      departure: {
        iataCode: "CDG",
        airportName: "Paris Charles de Gaulle",
        city: "Paris",
        local: "2026-12-05T09:15:00",
        ianaZone: "Europe/Paris",
        terminal: "2E",
        gate: "K34",
      },
      arrival: {
        iataCode: "HEL",
        airportName: "Helsinki-Vantaa",
        city: "Helsinki",
        local: "2026-12-05T13:40:00",
        ianaZone: "Europe/Helsinki",
        terminal: "T2",
      },
      checkInOpensLocal: "2026-12-05T07:15:00",
      travelers: [
        {
          traveler: { id: "trav_1", name: "Leo", handle: "leo" },
          seat: "14C",
          baggage: { cabin: "1x8kg", checked: "1x23kg" },
          checkInStatus: "checked-in",
        },
        {
          traveler: { id: "trav_2", name: "Amara", handle: "amara" },
          seat: "14D",
          baggage: { cabin: "1x8kg", checked: "1x23kg" },
          checkInStatus: "checked-in",
        },
      ],
    },
    {
      airlineName: "Finnair",
      carrierCode: "AY",
      flightNumber: "73",
      aircraftType: "Airbus A350",
      cabinClass: "Economy",
      fareType: "Value",
      departure: {
        iataCode: "HEL",
        airportName: "Helsinki-Vantaa",
        city: "Helsinki",
        local: "2026-12-05T14:15:00",
        ianaZone: "Europe/Helsinki",
        terminal: "T2",
        gate: "31",
      },
      arrival: {
        iataCode: "NRT",
        airportName: "Tokyo Narita",
        city: "Tokyo",
        local: "2026-12-06T07:15:00",
        ianaZone: "Asia/Tokyo",
        terminal: "1",
      },
      travelers: [
        {
          traveler: { id: "trav_1", name: "Leo", handle: "leo" },
          baggage: { cabin: "1x8kg", checked: "1x23kg" },
          checkInStatus: "not-checked-in",
        },
        {
          traveler: { id: "trav_2", name: "Amara", handle: "amara" },
          seat: "31A",
          baggage: { cabin: "1x8kg", checked: "1x23kg" },
          checkInStatus: "not-checked-in",
        },
      ],
    },
  ],
};

const returnFlightDetails = {
  type: "flight",
  bookingReference: "XJ7K9P",
  segments: [
    {
      airlineName: "Air France",
      carrierCode: "AF",
      flightNumber: "275",
      aircraftType: "Boeing 777-300ER",
      cabinClass: "Economy",
      fareType: "Value",
      departure: {
        iataCode: "NRT",
        airportName: "Tokyo Narita",
        city: "Tokyo",
        local: "2026-12-12T17:50:00",
        ianaZone: "Asia/Tokyo",
        terminal: "1",
        gate: "22",
      },
      arrival: {
        iataCode: "CDG",
        airportName: "Paris Charles de Gaulle",
        city: "Paris",
        local: "2026-12-12T22:20:00",
        ianaZone: "Europe/Paris",
        terminal: "2E",
      },
      checkInOpensLocal: "2026-12-12T14:50:00",
      travelers: [
        {
          traveler: { id: "trav_1", name: "Leo", handle: "leo" },
          seat: "22A",
          baggage: { cabin: "1x8kg", checked: "1x23kg" },
          checkInStatus: "not-checked-in",
        },
        {
          traveler: { id: "trav_2", name: "Amara", handle: "amara" },
          seat: "22B",
          baggage: { cabin: "1x8kg", checked: "1x23kg" },
          checkInStatus: "not-checked-in",
        },
      ],
    },
  ],
};

const bookingSeeds = [
  {
    id: ids.bookings.outbound,
    type: BookingType.FLIGHT,
    title: "AY1234/AY73 Paris CDG -> Tokyo NRT via Helsinki",
    startAt: "2026-12-05T08:15:00.000Z",
    startIanaZone: "Europe/Paris",
    endAt: "2026-12-05T22:15:00.000Z",
    endIanaZone: "Asia/Tokyo",
    confirmationNumber: "XJ7K9P",
    details: flightDetails,
    price: 1100,
    currency: "EUR",
    category: ExpenseCategory.TRANSPORT,
  },
  {
    id: ids.bookings.transfer,
    type: BookingType.TRANSFER,
    title: "Narita Express to Shinjuku",
    startAt: "2026-12-05T23:15:00.000Z",
    startIanaZone: "Asia/Tokyo",
    endAt: "2026-12-06T00:35:00.000Z",
    endIanaZone: "Asia/Tokyo",
    details: {},
    price: 30,
    currency: "EUR",
    category: ExpenseCategory.TRANSPORT,
  },
  {
    id: ids.bookings.lodging1,
    type: BookingType.ACCOMMODATION,
    title: "Shinjuku Granbell Hotel",
    startAt: "2026-12-06T06:00:00.000Z",
    startIanaZone: "Asia/Tokyo",
    endAt: "2026-12-09T02:00:00.000Z",
    endIanaZone: "Asia/Tokyo",
    details: {},
    price: 540,
    currency: "EUR",
    category: ExpenseCategory.ACCOMMODATION,
  },
  {
    id: ids.bookings.walk1,
    type: BookingType.ACTIVITY,
    title: "Tsukiji Outer Market walking food tour",
    startAt: "2026-12-06T23:00:00.000Z",
    startIanaZone: "Asia/Tokyo",
    endAt: "2026-12-07T02:00:00.000Z",
    endIanaZone: "Asia/Tokyo",
    details: { plannedWalkingKmForDay: 17 },
    price: 120,
    currency: "EUR",
    category: ExpenseCategory.ACTIVITY,
  },
  {
    id: ids.bookings.walk2,
    type: BookingType.ACTIVITY,
    title: "Asakusa & Ueno self-guided walking tour",
    startAt: "2026-12-07T04:00:00.000Z",
    startIanaZone: "Asia/Tokyo",
    endAt: "2026-12-07T09:00:00.000Z",
    endIanaZone: "Asia/Tokyo",
    details: {},
    price: 0,
    currency: "EUR",
    category: ExpenseCategory.ACTIVITY,
  },
  {
    id: ids.bookings.museum,
    type: BookingType.ACTIVITY,
    title: "teamLab Planets digital art museum",
    startAt: "2026-12-08T01:00:00.000Z",
    startIanaZone: "Asia/Tokyo",
    endAt: "2026-12-08T04:00:00.000Z",
    endIanaZone: "Asia/Tokyo",
    details: {},
    price: 25,
    currency: "EUR",
    category: ExpenseCategory.ACTIVITY,
  },
  {
    id: ids.bookings.dinner,
    type: BookingType.RESTAURANT,
    title: "Sushi Dai omakase dinner",
    startAt: "2026-12-09T10:00:00.000Z",
    startIanaZone: "Asia/Tokyo",
    endAt: "2026-12-09T11:30:00.000Z",
    endIanaZone: "Asia/Tokyo",
    confirmationNumber: "SD-9981",
    details: {},
    category: ExpenseCategory.FOOD,
  },
  {
    id: ids.bookings.night1,
    type: BookingType.ACTIVITY,
    title: "Golden Gai bar hopping",
    startAt: "2026-12-08T12:00:00.000Z",
    startIanaZone: "Asia/Tokyo",
    endAt: "2026-12-08T14:50:00.000Z",
    endIanaZone: "Asia/Tokyo",
    details: {},
    price: 40,
    currency: "EUR",
    category: ExpenseCategory.ACTIVITY,
  },
  {
    id: ids.bookings.night2,
    type: BookingType.TRAIN,
    title: "First train back to the hotel",
    startAt: "2026-12-08T15:30:00.000Z",
    startIanaZone: "Asia/Tokyo",
    endAt: "2026-12-08T16:00:00.000Z",
    endIanaZone: "Asia/Tokyo",
    details: {},
    price: 3,
    currency: "EUR",
    category: ExpenseCategory.TRANSPORT,
  },
  {
    id: ids.bookings.lodging2,
    type: BookingType.ACCOMMODATION,
    title: "Park Hyatt Tokyo",
    startAt: "2026-12-10T06:00:00.000Z",
    startIanaZone: "Asia/Tokyo",
    endAt: "2026-12-12T02:00:00.000Z",
    endIanaZone: "Asia/Tokyo",
    details: {},
    price: 780,
    currency: "EUR",
    category: ExpenseCategory.ACCOMMODATION,
  },
  {
    id: ids.bookings.return,
    type: BookingType.FLIGHT,
    title: "AF275 Tokyo NRT -> Paris CDG",
    startAt: "2026-12-12T08:50:00.000Z",
    startIanaZone: "Asia/Tokyo",
    endAt: "2026-12-12T21:20:00.000Z",
    endIanaZone: "Europe/Paris",
    confirmationNumber: "AF275Y",
    details: returnFlightDetails,
    price: 950,
    currency: "EUR",
    category: ExpenseCategory.TRANSPORT,
  },
  {
    id: ids.bookings.unscheduled,
    type: BookingType.ACTIVITY,
    title: "Pre-trip planning call (mis-dated booking)",
    startAt: "2026-11-20T09:00:00.000Z",
    startIanaZone: "Europe/Paris",
    endAt: "2026-11-20T09:30:00.000Z",
    endIanaZone: "Europe/Paris",
    details: {},
    price: 0,
    currency: "EUR",
    category: ExpenseCategory.ACTIVITY,
  },
] as const;

async function seed() {
  await privilegedPrisma.profile.upsert({
    where: { id: ids.owner },
    update: {
      email: "leo@seed.cadence.local",
      displayName: "Leo",
    },
    create: {
      id: ids.owner,
      email: "leo@seed.cadence.local",
      displayName: "Leo",
    },
  });

  await privilegedPrisma.travelerProfile.upsert({
    where: { id: ids.leo },
    update: {
      ownerId: ids.owner,
      accountId: ids.owner,
      firstName: "Leo",
      lastName: "",
      earliestWakeTime: new Date("1970-01-01T07:00:00.000Z"),
    },
    create: {
      id: ids.leo,
      ownerId: ids.owner,
      accountId: ids.owner,
      firstName: "Leo",
      lastName: "",
      earliestWakeTime: new Date("1970-01-01T07:00:00.000Z"),
    },
  });

  await privilegedPrisma.travelerProfile.upsert({
    where: { id: ids.amara },
    update: {
      ownerId: ids.owner,
      firstName: "Amara",
      lastName: "",
      earliestWakeTime: new Date("1970-01-01T08:30:00.000Z"),
    },
    create: {
      id: ids.amara,
      ownerId: ids.owner,
      firstName: "Amara",
      lastName: "",
      earliestWakeTime: new Date("1970-01-01T08:30:00.000Z"),
    },
  });

  await privilegedPrisma.travelerHealth.upsert({
    where: { travelerId: ids.leo },
    update: { maxWalkKmPerDay: 10, wheelchairUser: false },
    create: {
      travelerId: ids.leo,
      maxWalkKmPerDay: 10,
      wheelchairUser: false,
    },
  });

  await privilegedPrisma.travelerHealth.upsert({
    where: { travelerId: ids.amara },
    update: { maxWalkKmPerDay: 6, wheelchairUser: true },
    create: {
      travelerId: ids.amara,
      maxWalkKmPerDay: 6,
      wheelchairUser: true,
    },
  });

  await privilegedPrisma.travelDocument.upsert({
    where: { id: ids.amaraPassport },
    update: {
      travelerId: ids.amara,
      type: DocumentType.PASSPORT,
      issuingCountry: "FR",
      expiresOn: new Date("2027-03-15T00:00:00.000Z"),
    },
    create: {
      id: ids.amaraPassport,
      travelerId: ids.amara,
      type: DocumentType.PASSPORT,
      issuingCountry: "FR",
      expiresOn: new Date("2027-03-15T00:00:00.000Z"),
    },
  });

  await privilegedPrisma.trip.upsert({
    where: { id: ids.tokyo },
    update: {
      ownerId: ids.owner,
      title: "Tokyo whirlwind",
      destinationCity: "Tokyo",
      destinationCountry: "JP",
      ianaZone: "Asia/Tokyo",
      startDate: new Date("2026-12-05T00:00:00.000Z"),
      endDate: new Date("2026-12-12T00:00:00.000Z"),
      status: TripStatus.PLANNED,
      coverImageUrl:
        "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=80&auto=format&fit=crop",
    },
    create: {
      id: ids.tokyo,
      ownerId: ids.owner,
      title: "Tokyo whirlwind",
      destinationCity: "Tokyo",
      destinationCountry: "JP",
      ianaZone: "Asia/Tokyo",
      startDate: new Date("2026-12-05T00:00:00.000Z"),
      endDate: new Date("2026-12-12T00:00:00.000Z"),
      status: TripStatus.PLANNED,
      coverImageUrl:
        "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=80&auto=format&fit=crop",
    },
  });

  for (const [travelerId, role] of [
    [ids.leo, ParticipantRole.OWNER],
    [ids.amara, ParticipantRole.EDITOR],
  ] as const) {
    await privilegedPrisma.tripParticipant.upsert({
      where: {
        tripId_travelerId: { tripId: ids.tokyo, travelerId },
      },
      update: {
        role,
        inviteStatus: InviteStatus.ACCEPTED,
        canViewDocuments: false,
      },
      create: {
        tripId: ids.tokyo,
        travelerId,
        role,
        inviteStatus: InviteStatus.ACCEPTED,
        canViewDocuments: false,
        invitedAt: new Date("2026-12-05T00:00:00.000Z"),
        respondedAt: new Date("2026-12-05T00:00:00.000Z"),
      },
    });
  }

  for (const booking of bookingSeeds) {
    const data = {
      tripId: ids.tokyo,
      type: booking.type,
      title: booking.title,
      confirmationNumber:
        "confirmationNumber" in booking ? booking.confirmationNumber : null,
      status: BookingStatus.CONFIRMED,
      startAt: new Date(booking.startAt),
      startIanaZone: booking.startIanaZone,
      endAt: new Date(booking.endAt),
      endIanaZone: booking.endIanaZone,
      details: booking.details,
      verificationStatus: VerificationStatus.VERIFIED,
    };

    await privilegedPrisma.booking.upsert({
      where: { id: booking.id },
      update: data,
      create: { id: booking.id, ...data },
    });

    if ("price" in booking) {
      const expenseId = booking.id.replace(/^5/, "6");
      const half = booking.price / 2;
      const expenseData = {
        tripId: ids.tokyo,
        bookingId: booking.id,
        payerTravelerId: ids.leo,
        category: booking.category,
        label: booking.title,
        amount: booking.price,
        currency: booking.currency,
        fxRate: 1,
        amountBase: booking.price,
        baseCurrency: "EUR",
        spentAt: new Date(booking.startAt),
        ianaZone: booking.startIanaZone,
        splitMode: SplitMode.EQUAL,
      };

      await privilegedPrisma.expense.upsert({
        where: { bookingId: booking.id },
        update: expenseData,
        create: { id: expenseId, ...expenseData },
      });

      for (const travelerId of [ids.leo, ids.amara]) {
        await privilegedPrisma.expenseShare.upsert({
          where: {
            expenseId_travelerId: { expenseId, travelerId },
          },
          update: {
            shareWeight: 1,
            amountOwed: half,
            amountOwedBase: half,
          },
          create: {
            expenseId,
            travelerId,
            shareWeight: 1,
            amountOwed: half,
            amountOwedBase: half,
          },
        });
      }
    }
  }

  for (const bookingId of [ids.bookings.outbound, ids.bookings.return]) {
    for (const travelerId of [ids.leo, ids.amara]) {
      await privilegedPrisma.bookingTraveler.upsert({
        where: {
          bookingId_travelerId: { bookingId, travelerId },
        },
        update: {},
        create: { bookingId, travelerId },
      });
    }
  }

  console.info(
    "Seeded Tokyo whirlwind with 12 bookings, 2 travelers, and the hostile scenarios.",
  );
}

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await privilegedPrisma.$disconnect();
  });
