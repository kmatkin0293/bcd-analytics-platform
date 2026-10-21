"use client";

import { Button, Field, Flex, Input, Stack, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ChakraA } from "@/components/chakra-elements";
import { useThoughtSpotAuth } from "@/components/thoughtspot/thoughtspot-auth-provider";

export function LoginForm() {
  const router = useRouter();
  const { refresh } = useThoughtSpotAuth();

  // Demo placeholder — any value works, the real backend auth is fixed
  // server-side (see THOUGHTSPOT_DEMO_USERNAME in src/config.ts).
  const [username, setUsername] = useState("TS123");
  const [password, setPassword] = useState("TS123");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = username.trim();
    if (!trimmed) {
      setError("Enter your username.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Unable to sign in.");
      }

      await refresh();
      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="20px" mt="32px">
        <Field.Root required>
          <Field.Label
            fontFamily="mono"
            fontSize="11.5px"
            letterSpacing="0.12em"
            textTransform="uppercase"
            color="fg.subtle"
          >
            Username
          </Field.Label>
          <Input
            name="username"
            type="text"
            autoComplete="username"
            spellCheck={false}
            placeholder="TS123"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            disabled={submitting}
            bg="bg.canvas"
            borderColor="border.strong"
            borderRadius="8px"
            px="15px"
            py="14px"
            h="auto"
            fontSize="16px"
            transition="border-color 0.2s, background-color 0.2s, box-shadow 0.2s"
            _focus={{
              borderColor: "gt.500",
              bg: "bg.surface",
              boxShadow: "0 0 0 3px rgba(75,40,130,0.15)",
            }}
          />
        </Field.Root>

        <Field.Root>
          <Flex w="100%" justify="space-between" align="baseline" gap="12px">
            <Field.Label
              fontFamily="mono"
              fontSize="11.5px"
              letterSpacing="0.12em"
              textTransform="uppercase"
              color="fg.subtle"
            >
              Password
            </Field.Label>
            <Text
              fontFamily="mono"
              fontSize="11.5px"
              letterSpacing="0.08em"
              color="gt.500"
              cursor="default"
            >
              Show
            </Text>
          </Flex>
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="TS123"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={submitting}
            bg="bg.canvas"
            borderColor="border.strong"
            borderRadius="8px"
            px="15px"
            py="14px"
            h="auto"
            fontSize="16px"
            transition="border-color 0.2s, background-color 0.2s, box-shadow 0.2s"
            _focus={{
              borderColor: "gt.500",
              bg: "bg.surface",
              boxShadow: "0 0 0 3px rgba(75,40,130,0.15)",
            }}
          />
        </Field.Root>

        {error ? (
          <Flex
            align="center"
            gap="10px"
            borderWidth="1px"
            borderColor="gt.500"
            bg="gt.50"
            color="gt.700"
            borderRadius="8px"
            px="14px"
            py="12px"
            fontFamily="mono"
            fontSize="12px"
          >
            {error}
          </Flex>
        ) : null}

        <Button
          type="submit"
          variant="solid"
          disabled={submitting}
          w="100%"
          textAlign="center"
          loading={submitting}
          loadingText="Signing in…"
        >
          Sign in
        </Button>

        <Flex wrap="wrap" gap="16px" justify="space-between" align="center">
          <ChakraA
            href="#reset"
            fontFamily="mono"
            fontSize="12px"
            color="fg.subtle"
            borderBottomWidth="1px"
            borderColor="border.strong"
            pb="2px"
          >
            Forgot password
          </ChakraA>
          <ChakraA
            href="#help"
            fontFamily="mono"
            fontSize="12px"
            color="fg.subtle"
            borderBottomWidth="1px"
            borderColor="border.strong"
            pb="2px"
          >
            Trouble signing in
          </ChakraA>
        </Flex>
      </Stack>
    </form>
  );
}
