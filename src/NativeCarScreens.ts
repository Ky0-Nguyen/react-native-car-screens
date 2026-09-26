import {
  TurboModuleRegistry,
  type CodegenTypes,
  type TurboModule,
} from 'react-native';

/**
 * Templates and alerts cross the bridge as JSON strings so both platforms
 * share one schema (see types.ts) without per-field codegen plumbing.
 */
export interface Spec extends TurboModule {
  setRoot(templateJson: string): void;
  push(templateJson: string): void;
  pop(): void;
  showAlert(alertJson: string): void;
  dismissAlert(): void;
  isConnected(): boolean;
  /** JSON-encoded CarEvent. */
  readonly onCarEvent: CodegenTypes.EventEmitter<string>;
}

export default TurboModuleRegistry.get<Spec>('CarScreens');
