
# Fighting game connection tester

This application tests the network connection between two peers with regard to
the requirements of fighting games. This application can tell good wifi apart from bad wifi.
A good connection has two things: Low average ping, and few to no ping spikes.

I have tested that it measures fighting game connections by
being on a good connection, running the test, and playing games against a friend of mine across the ocean, and then switching to a bad connection and doing the same, and seeing that this application shows bad connections as bad, and good connections as good.

If you're on a wireless connection and you are unsure of whether you're ruining the experience for the other player, you can run this test with him or her. You can also use this test as a tournament organiser to solve connection disputes.

## Known issues

Other networking applications can change the result of the test. One time when I ran the test between two instances on the same computer, I got a lot of ping spikes when, as the test was running, I started Slack (a messaging program).
I don't know if it's networking programs in general, or specifically, other applications that use WebRTC. I suspect the latter but I haven't tested it.

Currently, after running a test, the page must be refreshed in order to run another. I'm going to change that when I clean up the code.
