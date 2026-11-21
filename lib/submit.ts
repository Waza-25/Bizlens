import { startTransition, type FormEvent } from "react";

// React normally clears a form after every submit, even when the save failed.
// This sends the form to the Server Action WITHOUT clearing it, so a user who
// sees an error can fix one field instead of retyping everything.
// (The pages clear the form after a successful save by giving it a new key.)
export function submitWithoutReset(action: (form: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const form = new FormData(event.currentTarget, submitter);
    startTransition(() => action(form));
  };
}
