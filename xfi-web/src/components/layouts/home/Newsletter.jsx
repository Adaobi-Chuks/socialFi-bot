import React, { useRef, useState } from "react";

function Newsletter() {
  const [email, setEmail] = useState("");
  const formRef = useRef(null);

  const addToWaitlist = async (e) => {
    e.preventDefault();
    // if (email.trim() === "") {
    //   errorMsgs("Please Fill all inputs!");
    //   return
    // }
    // const { data, error } = await supabase.from("waitlist").insert([{ email }]);

    // if (error) console.error(error);
    // else {
    //   successMsg("Email Added to waitlist!");
    //   formRef.current.reset()
    //   console.log("Added to waitlist!", data)};
  };
  return (
    <section className="newsletter" id="newsletter">
      {/* <h1>Stay Updated</h1> */}
      <h1>Join Newsletter</h1>
      <h2>
        Join our Newsletter to stay in the loop with our newest feature releases
      </h2>
      <form action="" onSubmit={addToWaitlist} ref={formRef}>
        <input
          type="email"
          placeholder="Enter Your Email Address"
          onChange={(e) => {
            setEmail(e.target.value);
          }}
        />
        <button>Join Now</button>
      </form>
    </section>
  );
}

export default Newsletter;
