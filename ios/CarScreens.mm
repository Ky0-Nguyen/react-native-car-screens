#import "CarScreens.h"

// The generated Swift header references CarPlay and UIKit types.
#import <CarPlay/CarPlay.h>
#import <UIKit/UIKit.h>

#if __has_include(<CarScreens/CarScreens-Swift.h>)
#import <CarScreens/CarScreens-Swift.h>
#else
#import "CarScreens-Swift.h"
#endif

// TurboModule facade: forwards to the Swift store that the CarPlay scene renders.
@implementation CarScreens

+ (NSString *)moduleName
{
  return @"CarScreens";
}

- (instancetype)init
{
  if (self = [super init]) {
    __weak CarScreens *weakSelf = self;
    RNCarScreensStore.shared.eventSink = ^(NSString *json) {
      [weakSelf emitOnCarEvent:json];
    };
  }
  return self;
}

- (void)setRoot:(NSString *)templateJson
{
  [RNCarScreensStore.shared setRootWithJson:templateJson];
}

- (void)push:(NSString *)templateJson
{
  [RNCarScreensStore.shared pushWithJson:templateJson];
}

- (void)pop
{
  [RNCarScreensStore.shared pop];
}

- (void)showAlert:(NSString *)alertJson
{
  [RNCarScreensStore.shared showAlertWithJson:alertJson];
}

- (void)dismissAlert
{
  [RNCarScreensStore.shared dismissAlert];
}

- (NSNumber *)isConnected
{
  return @(RNCarScreensStore.shared.isConnected);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeCarScreensSpecJSI>(params);
}

@end
