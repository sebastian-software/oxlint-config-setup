import { screen } from "@testing-library/react";

async function verify() {
  await screen.findByRole("button");
}

void verify();
