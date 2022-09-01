---
title: "State Machine"
weight: 100
type: langium
layout: showcase-page
url: "/showcase/statemachine"
img: "/assets/Langium_Statemachine.svg"
description: A language that captures the functionality of a state machine. Demonstrated by modeling a traffic light.
geekdochidden: true
draft: false
noMain: true
---

{{< monaco-maincode >}}// Create your own statemachine here!
statemachine TrafficLight

events
    switchCapacity
    next

initialState PowerOff

state PowerOff
    switchCapacity => RedLight
end

state RedLight
    switchCapacity => PowerOff
    next => GreenLight
end

state YellowLight
    switchCapacity => PowerOff
    next => RedLight
end

state GreenLight
    switchCapacity => PowerOff
    next => YellowLight
end
{{< /monaco-maincode >}}