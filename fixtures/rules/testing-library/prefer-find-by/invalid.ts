import { screen, waitFor } from "@testing-library/react";

async function verify() {
  await waitFor(() => screen.getByRole("button"));
}

void verify();
