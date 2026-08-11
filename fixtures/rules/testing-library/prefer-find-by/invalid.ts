import { screen, waitFor } from "@testing-library/react";

async function verify() {
  const button = await waitFor(() => screen.getByRole("button"));
  void button;
}

void verify();
