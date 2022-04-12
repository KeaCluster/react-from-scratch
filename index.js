// Attempt to create react from scratch

// src
// https://pomb.us/build-your-own-react/

// Spread so children are array no matter how many elements passed into it
function createElement(type, props, ...children) {
    return {
        type,
        props: {
            ...props,
            children: children.map(child =>
                typeof child == "object"
                    ? child
                    : createTextElement(child))
        },
    }
}

// in case of primitive values
function createTextElement(text) {
    return {
        type: "TEXT_ELEMENT",
        props: {
            nodeValue: text,
            children: [],
        },
    }
}


// Handle DOM render

function createDom(fiber) {
    const dom =
        fiber.type == "TEXT_ELEMENT"
            ? document.createTextNode("")
            : document.createElement(element.type)

    updateDom(dom, {}, fiber.props)

    return dom
}


const isEvent = key => key.startsWith("on") // check and update event listeners
const isProperty = key => key !== "children" && !isEvent(key)
const isNew = (prev, next) => key => prev[key] !== next[key]
const isGone = (prev, next) => key => !(key in next)

function updateDom(dom, prevProps, nextProps) {

    // Remove changed event handlers
    Object.keys(prevProps)
        .filter(isEvent)
        .filter(
            key =>
                !(key in nextProps) ||
                isNew(prevProps, nextProps)(key)
        )
        .forEach(name => {
            const eventType = name.toLowerCase().substring(2)
            dom.removeEventListener(eventType, prevProps[name])
        })

    // Remove old
    Object.keys(prevProps)
        .filter(isProperty)
        .filter(isGone(prevProps, nextProps))
        .forEach(name => {
            dom[name] = ""
        })

    // Add new / changed 
    Object.keys(nextProps)
        .filter(isProperty)
        .filter(isNew(prevProps, nextProps))
        .forEach(name => {
            dom[name] = nextProps[name]
        })

    // Add new event handlers
    Object.keys(nextProps)
        .filter(isEvent)
        .filter(isNew(prevProps, nextProps))
        .forEach(name => {
            const eventType = name.toLowerCase().substring(2)
            dom.addEventListener(eventType, nextProps[name])
        })
}


// Commit entire fiber tree to DOM
// Only when no nextUnitOfWork exists
function commitRoot() {
    deletions.forEach(commitWork) // Commit delted nodes
    commitWork(wipRoot.child) // recursive
    currentRoot = wipRoot
    wipRoot = null
}


// Recursively 
function commitWork(fiber) {
    if (!fiber) return

    // Functional components update
    let domParentFiber = fiber.parent
    while (!domParentFiber.dom) {
        domParentFiber = domParentFiber.parent // << find fiber with node
    }
    const domParent = domParentFiber.dom




    if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
        // Append node to parent fiber
        domParent.appendChild(fiber.dom)
    } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
        // Update DOM node with props
        updateDOM(
            fiber.dom,
            fiber.alternate.props,
            fiber.props
        )
    } else if (fiber.effectTag === "DELETION") {
        commitDeletion(fiber, domParent)
        // Remove child
    }

    commitWork(fiber.child)
    commitWork(fiber.sibling)
}

// Functional component support
// Recursively find the node
function commitDeletion(fiber, domParent) {
    if
        (fiber.dom) domParent.removeChild(fiber.dom)
    else
        commitDeletion(fiber.child, domParent)
}

function render(element, container) {
    wipRoot = {
        dom: container,
        props: {
            children: [element],
        },
        alternate: currentRoot, // link prev commit fiber
    }
    deletions = []
    nextUnitOfWork = wipRoot
}

// So this bit basically handles thread blockage
// due to the render tree being too big

let nextUnitOfWork = null
let wipRoot = null
let currentRoot = null
let deletions = null

function workLoop(deadline) {
    let shouldYield = false
    while (nextUnitOfWork && !shouldYield) {
        nextUnitOfWork = performUnitOfWork(
            nextUnitOfWork
        )
        shouldYield = deadline.timeRemaining() < 1
    }

    // Commit fiber tree
    if (!nextUnitOfWork && wipRoot) {
        commitRoot()
    }

    requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)

function performUnitOfWork(fiber) {
    // Check if functional component and update acordingly
    const isFunctionComponent = fiber.type instanceof Function

    if (isFunctionComponent)
        updateFunctionComponent(fiber)
    else
        updateHostComponent(fiber)

    // Search nextUnitOfWork
    // Try child, siblings, sibling of parent, etc
    if (fiber.child) {
        return fiber.child
    }

    let nextFiber = fiber
    while (nextFiber) {
        if (nextFiber.sibling) {
            return nextFiber.sibling
        }
        nextFiber = nextFiber.parent
    }
}

let wipFiber = null
let hookIndex = null


function updateFunctionComponent(fiber) {
    wipFiber = fiber
    hookIndex = 0
    wipFiber.hooks = []

    // << children are gathered from the execution of the component, not props
    const children = [fiber.type(fiber.props)]
    reconcileChildren(fiber, children)
}

function useState(initial) {
    // check for old hook
    const oldHook =
        wipFiber.alternate &&
        wipFiber.alternate.hooks &&
        wipFiber.alternate.hooks[hookIndex]

    // If old hook exists, state is copied else initialize
    const hook = {
        state: oldHook ? oldHook.state : initial,
        queue: [],
    }

    // fetch actions from oldHook and apply to new hook state
    const actions = oldHook ? oldHook.queue : []
    actions.forEach(action => {
        hook.state = action(hook.state)
    })

    // Hooks return function that updates state
    const setState = action => {
        hook.queue.push(action)
        wipRoot = {
            dom: currentRoot.dom,
            props: currentRoot.props,
            alternate: currentRoot,
        }
        nextUnitOfWork = wipRoot
        deletions = []
    }

    // add, increment and return
    wipFiber.hooks.push(hook)
    hookIndex++
    return [hook.state, setState]
}



function updateHostComponent(fiber) {
    // fiber.dom keeps track of the node
    if (!fiber.dom) {
        fiber.dom = createDom(fiber)
    }
    reconcileChildren(fiber, fiber.props.children)
}

function reconcileChildren(wipFiber, elements) {
    let index = 0
    let oldFiber =
        wipFiber.alternate && wipFiber.alternate.child
    let prevSibling = null

    while (
        index < elements.length ||
        oldFiber != null
    ) {
        // what is going to render
        const element = elements[index]
        let newFiber = null

        const sameType =
            oldFiber &&
            element &&
            element.type == oldFiber.type

        // just update props
        if (sameType) {
            newFiber = {
                type: oldFiber.type,
                props: element.props,
                dom: oldFiber.dom,
                parent: wipFiber,
                alternate: oldFiber,
                effectTag: "UPDATE",
            }
        }

        // create new DOM node
        if (element && !sameType) {
            newFiber = {
                type: element.type,
                props: element.props,
                dom: null,
                parent: wipFiber,
                alternate: null,
                effectTag: "PLACEMENT",
            }
        }

        // remove old node
        if (oldFiber && !sameType) {
            oldFiber.effectTag = "DELETION"
            deletions.push(oldFiber)
        }



        if (oldFiber) oldFiber = oldFiber.sibling

        // Add child to fiber tree
        if (index == 0) {
            fiber.child = newFiber
        } else {
            prevSibling.sibling = newFiber
        }

        prevSibling = newFiber
        index++
    }
}


//  Initialize
const Didact = {
    createElement,
    render,
    useState
}


// Force babel to transpile JSX with our Didact **

/** @jsx Didact.createElement */
function Counter() {
    const [state, setState] = Didact.useState(0)
    return (
        <h1 onClick={() => setState(c => c + 1)}>
            Count: {state}
        </h1>
    )
}
// Fiber from functional components dont have DOM node
// Children are fetched from running the function, not props

// Standard
const element = <Counter />
const container = document.getElementById("root");
Didact.render(element, container)