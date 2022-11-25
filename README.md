Fighting game connection tester
===
This application tests the network connection between two peers with regard to
the requirements of fighting games.
A perfect connection has no ping spikes.
The fewer ping spikes, the better the connection for fighting games.
A few ping spikes over the course of the two minute test are acceptable, especially if spread out and not all at once.

This was my first time using WebRTC and I had to learn a bunch of new stuff, so cleaning up of the code and adding some features will come in a future push (it will stay minimalistic though and won't get bloated).

This is a minimum viable product. I have tested that it measures fighting game connections by
being on a good connection, running the test, and playing games against a friend of mine acrossthe ocean, and then switching to a bad connection and doing the same, and seeing that this application shows bad connections as bad, and good connections as good.
