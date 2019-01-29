import Vue, { ComponentOptions } from 'vue'

// 一个构造器函数，返回V和Vue混合的对象
// 为什么要 & typeof Vue？？？
export type VueClass<V> = { new (...args: any[]): V & Vue } & typeof Vue

// 扩展保存装饰器结果的属性
export type DecoratedClass = VueClass<Vue> & {
  // Property, method and parameter decorators created by `createDecorator` helper
  // will enqueue functions that update component options for lazy processing.
  // They will be executed just before creating component constructor.
  __decorators__?: ((options: ComponentOptions<Vue>) => void)[]
}
