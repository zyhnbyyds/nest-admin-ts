type TransformOrigin = [string, () => any];

const ddd: TransformOrigin[] = [
  ['a', () => 'm'],
  ['b', () => 'd'],
];
/**
 * 策略模式执行
 */
export function TransformResponse(
  data: any,
  toRunOrigin: TransformOrigin[],
  toRunFnName: string,
) {
  const ddd = {
    data,
    msg: 'sdd',
    toRunFnName,
  };
  for (let index = 0; index < toRunOrigin.length; index++) {
    if (toRunOrigin[0][0] === toRunFnName) {
      ddd.toRunFnName = toRunFnName;
    }
    return;
  }
  console.log(ddd.toRunFnName);

  return ddd;
}

TransformResponse('1', ddd, 'b');
