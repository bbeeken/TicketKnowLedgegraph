# OpsGraph Mobile (Expo)

This folder contains an Expo-based React Native app for OpsGraph (Sprint 3).

## Requirements
- Node 18+ (or as required by Expo SDK 49)
- Expo CLI installed globally: `npm install -g expo-cli`

## Setup
1. Copy `.env.sample` to `.env` and set `EXPO_PUBLIC_API_BASE_URL` to the Sprint-2 API base URL.
2. From this folder run:
   - `npm install`
   - `expo start`

## Running
- `npm start` - start Expo dev server
- `npm test` - run jest tests

## Notes
- SSE requires HTTP/HTTPS reachability to the server. For Android emulator use `10.0.2.2`.
- Use `.env` to toggle SSE.
