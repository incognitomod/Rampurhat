// Example: Firebase Authentication with signInWithRedirect
// Make sure Firebase SDK is included in index.html if you are using Firebase

// Dummy function to simulate sign-in if you are not using Firebase yet
function signIn() {
  try {
    // Save a temporary state in sessionStorage to avoid "missing initial state" error
    sessionStorage.setItem('signin_state', 'initiated');

    // Replace this with your actual redirect logic if using Firebase:
    // firebase.auth().signInWithRedirect(provider);

    // Simulate redirect (for testing)
    setTimeout(() => {
      sessionStorage.setItem('signin_state', 'completed');
      alert("Sign-in successful!");
    }, 1000);

  } catch (error) {
    console.error("Sign-in error:", error);
    alert("Unable to sign in. Check your browser storage settings.");
  }
}

// Attach event
document.getElementById('signinBtn').addEventListener('click', signIn);

// Optional: Check if user returned from redirect
window.addEventListener('load', () => {
  if (sessionStorage.getItem('signin_state') === 'initiated') {
    // Normally handle Firebase redirect result here
    console.log("Handling redirect result...");
    // Clear state
    sessionStorage.removeItem('signin_state');
  }
});
