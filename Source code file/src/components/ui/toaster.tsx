"use client";

import {
  Toaster as ChakraToaster,
  createToaster,
  Spinner,
  Stack,
  Toast,
} from "@chakra-ui/react";

import { Portal } from "@/components/motion/portal";

/** Shared toaster instance — call `toaster.create({...})` from anywhere to raise a toast. */
export const toaster = createToaster({
  placement: "bottom-end",
  pauseOnPageIdle: true,
});

/** Mounted once near the app root. Uses this app's own `Portal` (not Chakra's) for
 * consistency with every other overlay in the app — see portal.tsx for why. */
export function Toaster() {
  return (
    <Portal>
      <ChakraToaster toaster={toaster} insetInline={{ mdDown: "4" }}>
        {(toast) => (
          <Toast.Root
            width={{ md: "sm" }}
            bg="bg.raised"
            borderWidth="1px"
            borderColor="border.default"
            borderTopWidth="3px"
            borderTopColor={toast.type === "error" ? "ink.600" : "gt.500"}
            borderRadius="10px"
            boxShadow="0 20px 50px rgba(20, 26, 36, 0.25)"
            px="16px"
            py="13px"
          >
            {toast.type === "loading" ? (
              <Spinner size="sm" color="gt.500" />
            ) : (
              <Toast.Indicator />
            )}
            <Stack gap="2px" flex="1" maxWidth="100%">
              {toast.title ? (
                <Toast.Title
                  fontFamily="mono"
                  fontSize="11.5px"
                  letterSpacing="0.06em"
                  textTransform="uppercase"
                  color="fg.default"
                >
                  {toast.title}
                </Toast.Title>
              ) : null}
              {toast.description ? (
                <Toast.Description fontSize="12.5px" color="fg.muted">
                  {toast.description}
                </Toast.Description>
              ) : null}
            </Stack>
            {toast.action ? (
              <Toast.ActionTrigger
                fontFamily="mono"
                fontSize="11px"
                color="gt.500"
              >
                {toast.action.label}
              </Toast.ActionTrigger>
            ) : null}
            {toast.closable ? <Toast.CloseTrigger /> : null}
          </Toast.Root>
        )}
      </ChakraToaster>
    </Portal>
  );
}
