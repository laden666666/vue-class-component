import Vue, { ComponentOptions } from 'vue'
import { VueClass } from './declarations'
import { componentFactory, $internalHooks } from './component'

// 对外暴露的对象有4个，createDecorator VueDecorator mixins Component。
// 其中createDecorator VueDecorator mixins都是工具函数，而Component是装饰器
export { createDecorator, VueDecorator, mixins } from './util'

// Component也是重载函数，可用用于@Component class ...形式，也支持@Component(options) class...形式
function Component <V extends Vue>(options: ComponentOptions<V> & ThisType<V>): <VC extends VueClass<V>>(target: VC) => VC
function Component <VC extends VueClass<Vue>>(target: VC): VC
function Component (options: ComponentOptions<Vue> | VueClass<Vue>): any {
  // 如果options是一个函数，表明是一个类，使用componentFactory(options)
  if (typeof options === 'function') {
    // options是VueClass<Vue>，此时是正则的类装饰
    return componentFactory(options)
  }
  
  // 否则是一个vue的ComponentOptions，返回真正的类装饰器
  return function (Component: VueClass<Vue>) {
    return componentFactory(Component, options)
  }
}

Component.registerHooks = function registerHooks (keys: string[]): void {
  $internalHooks.push(...keys)
}

export default Component
