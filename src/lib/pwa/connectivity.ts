export type ConnectivityState = "online" | "offline";

export function getConnectivityState(isOnline: boolean): ConnectivityState {
  return isOnline ? "online" : "offline";
}