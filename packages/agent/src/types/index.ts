import { Awaitable } from "@0x-jerry/utils";

export interface IDisposable {
  dispose: () => Awaitable<void>;
}
