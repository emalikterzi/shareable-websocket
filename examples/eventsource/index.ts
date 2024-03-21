import {ShareableEventSource} from "../../lib/shared-tab-es.ts";

const urlParams = new URLSearchParams(window.location.search);
const namespace = urlParams.get('ns') || 'default';

const ns = document.querySelector('#ns')
const pageWrapper = document.querySelector('#page-wrapper')

if (ns) ns.innerHTML = namespace

let i = 0;
let controller: AbortController;
let a: ShareableEventSource

console.log('here')

async function init() {
    controller = new AbortController()
    a = new ShareableEventSource({url: 'http://localhost:8383/subscribe'}, {namespace: namespace})
    await a.isReady()
    const ul = document.querySelector('#messages')

    function ongMsg(ev: any) {
        console.log(ev)
        if (!ul) {
            console.log('element not found')
            return
        }
        if (i == 10) {
            i = 0
            const list = document.querySelectorAll('ul li');
            if (list) {
                list.forEach((value) => value.remove())
            }
        }
        i++
        const liEl = document.createElement('li')
        liEl.innerText = `index ${i} message ${ev.data}`
        ul.append(liEl)
    }

    setInterval(() => {
        if (pageWrapper) pageWrapper.className = a.isLeader() ? 'wrapper master' : 'wrapper'
    }, 1000)

    a.getConnection().addEventListener("message", ongMsg, {signal: controller.signal})

    a.getConnection().addEventListener("close", () => {
        console.log('closed')
    })
    a.getConnection().addEventListener("open", () => {
        console.log('opened')
    })

    a.getConnection().addEventListener("customConnected", ev => {
        console.log('connected', ev)
    })
}


document.querySelector('#connect')?.addEventListener('click', () => {
    init()
})

document.querySelector('#close')?.addEventListener('click', () => {
    a.close()
})

document.querySelector('#cancel')?.addEventListener('click', () => {
    controller.abort()
})
