# Bulk Mailer for Turms Anonymous Message Transpoty

## Introduction

This utility is a bulk mailer for Turms Anonymous Message Transport. You can use it to conveniently send Turms messages to a list of Ethereum addresses. The list is a simple text file, with one address per line. You also have the option to filter the list of addresses based on how much Ether is in each account, the number of Turms messages that have been sent from the account, and the spam/message fee of the account.

## Private key

In order to avoid having to sign each transaction individually, you are required to enter your Ethereum private key. Of course your private key is never transmitted or saved. But it's poor form for any website to ask you to enter a private key. Because of this, this utility is not hosted on any website -- you need to run it in a sandboxed environment on your own computer.

## Swarm

By default messages are stored in the Ethereum blockchain as event logs. However from the options panel the user can select to store all messages on Swarm (with only the message hashes stored on the Ethereum blockchain as event logs). When storing messages on Swarm it's possible to send much larger messages/attachments. The limit for Ethereum event logs is in the range of 20KB, and the current limit for Swarm is more than 10 times that. Storing messages on Swarm is cheaper, especially when sending large messages/attachments -- however, messages stored on Swarm are not guaranteed to persist. The default swarm gateway is https://swarm-gateways.net, but this can also be changed in the options panel. There is also an option to use Swarm only for messages that have attachments.

## Building

* `Install browserfy`
* `cd ui`
* `npm install`
* `patch -p0 < ./swarm.patch`
* `make`
* `cp -R build/* /var/web/html/`

To make a deployable version

* `make deploy`
